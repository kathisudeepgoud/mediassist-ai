const { query } = require('../config/db');
const {
  checkGeminiHealth,
  generateAssistantChatResponse,
  streamAssistantChatResponse
} = require('../services/gemini.service');

/**
 * Helper to fetch authenticated patient minimal context
 */
async function fetchPatientContext(userId, userMessage) {
  const lower = (userMessage || '').toLowerCase();

  // 1. Fetch authenticated patient profile
  const userRes = await query(
    `SELECT name, age, gender, blood_group as "bloodGroup", height_cm as "heightCm", 
            weight_kg as "weightKg", smoking_habit as "smokingHabit", activity_level as "activityLevel",
            dietary_preference as "dietaryPreference", allergies, existing_conditions as "existingConditions"
     FROM users WHERE id = $1`,
    [userId]
  );
  const profile = userRes.rows[0] || null;

  // 2. Conditionally fetch report / vitals if relevant
  let latestReport = null;
  const isAskingReport = /report|test|result|summary|finding|lab/i.test(lower);
  if (isAskingReport) {
    const reportRes = await query(
      `SELECT id, type, summary, report_date as "reportDate", hospital, doctor, original_filename as "originalFilename", created_at as "createdAt"
       FROM medical_reports 
       WHERE user_id = $1 
       ORDER BY report_date DESC, created_at DESC 
       LIMIT 1`,
      [userId]
    );
    latestReport = reportRes.rows[0] || null;
  }

  // 3. Fetch latest recorded vitals
  const vitalsRes = await query(
    `SELECT label, value, unit, status, reference_range as "referenceRange"
     FROM vital_readings 
     WHERE user_id = $1 
     ORDER BY recorded_at DESC 
     LIMIT 10`,
    [userId]
  );
  const vitals = vitalsRes.rows || [];

  // 4. Pre-computed ML disease risk results (only if risk query)
  let diseaseRisks = [];
  if (/risk|disease|diabetes|heart|kidney|liver/i.test(lower)) {
    const risksRes = await query(
      `SELECT name, status, percentage
       FROM disease_risks 
       WHERE user_id = $1`,
      [userId]
    );
    diseaseRisks = risksRes.rows || [];
  }

  // 5. Diet plan summary (only if diet query)
  let dietPlan = null;
  if (/diet|food|meal|calorie|protein|eat|nutrition/i.test(lower)) {
    const dietRes = await query(
      `SELECT plan_json 
       FROM diet_plans 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId]
    );
    if (dietRes.rows.length > 0 && dietRes.rows[0].plan_json) {
      const p = dietRes.rows[0].plan_json;
      dietPlan = {
        targetCalories: p.targetCalories || p.dailyNutrition?.calories,
        healthGoal: p.preferences?.healthGoal
      };
    }
  }

  // 6. Fetch recent conversation history (max 6 turns)
  const historyRes = await query(
    `SELECT role, content, timestamp 
     FROM chat_messages 
     WHERE user_id = $1 
     ORDER BY timestamp DESC 
     LIMIT 6`,
    [userId]
  );
  const conversationHistory = historyRes.rows.reverse();

  return {
    patientContext: {
      profile,
      latestReport,
      vitals,
      diseaseRisks,
      dietPlan
    },
    conversationHistory
  };
}

/**
 * POST /api/assistant/chat
 * Synchronous AI chat with Google Gemini API
 */
const chat = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: { message: 'Message text is required.' }
      });
    }

    const cleanUserMessage = message.trim();
    const { patientContext, conversationHistory } = await fetchPatientContext(userId, cleanUserMessage);

    let assistantResult;
    try {
      assistantResult = await generateAssistantChatResponse(
        patientContext,
        conversationHistory,
        cleanUserMessage
      );
    } catch (geminiErr) {
      console.error('[Gemini Assistant Error]', geminiErr.message);
      return res.status(503).json({
        error: {
          message: geminiErr.message || 'AI Assistant is currently unavailable. Please check Gemini API configuration.'
        }
      });
    }

    // Persist messages to chat_messages table
    await query(
      `INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)`,
      [userId, 'user', cleanUserMessage]
    );

    await query(
      `INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)`,
      [userId, 'assistant', assistantResult.message]
    );

    return res.status(200).json({
      message: assistantResult.message,
      model: assistantResult.model,
      isEmergency: Boolean(assistantResult.isEmergency),
      timingMs: assistantResult.timingMs,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/assistant/chat/stream
 * Server-Sent Events (SSE) streaming AI chat with Google Gemini API
 */
const chatStream = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: { message: 'Message text is required.' }
      });
    }

    const cleanUserMessage = message.trim();
    const { patientContext, conversationHistory } = await fetchPatientContext(userId, cleanUserMessage);

    // Save user message to database immediately
    await query(
      `INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)`,
      [userId, 'user', cleanUserMessage]
    );

    // Configure SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    streamAssistantChatResponse(
      patientContext,
      conversationHistory,
      cleanUserMessage,
      {
        onToken: (delta) => {
          res.write(`data: ${JSON.stringify({ token: delta, done: false })}\n\n`);
        },
        onComplete: async (result) => {
          try {
            if (result.fullText) {
              await query(
                `INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)`,
                [userId, 'assistant', result.fullText]
              );
            }
          } catch (dbErr) {
            console.warn('[Chat DB Save Warning]', dbErr.message);
          }

          res.write(`data: ${JSON.stringify({
            done: true,
            fullText: result.fullText,
            model: result.model,
            isEmergency: result.isEmergency,
            timingMs: result.timingMs
          })}\n\n`);
          res.end();
        },
        onError: (err) => {
          console.error('[Gemini Stream Error]', err.message);
          res.write(`data: ${JSON.stringify({
            error: err.message || 'AI Assistant streaming interrupted. Please check Gemini API configuration.',
            done: true
          })}\n\n`);
          res.end();
        }
      }
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/assistant/history
 * Retrieve stored conversation history for the authenticated patient
 */
const getHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await query(
      `SELECT id, role, content, timestamp 
       FROM chat_messages 
       WHERE user_id = $1 
       ORDER BY timestamp ASC`,
      [userId]
    );

    return res.status(200).json({
      messages: result.rows.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      }))
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/assistant/history
 * Clear stored conversation history for the authenticated patient
 */
const clearHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await query(`DELETE FROM chat_messages WHERE user_id = $1`, [userId]);

    return res.status(200).json({
      message: 'Conversation history cleared successfully.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/assistant/health
 * Check real-time Google Gemini AI availability
 */
const getAiHealth = async (req, res, next) => {
  try {
    const health = await checkGeminiHealth();
    return res.status(200).json(health);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  chat,
  chatStream,
  getHistory,
  clearHistory,
  getAiHealth
};
