const { checkGeminiHealth } = require('../services/gemini.service');
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

/**
 * Health Controller for Express
 */
const getHealthStatus = (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Express API Server',
    message: 'Express backend is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
};

/**
 * Check AI Model Loading Status (combines FastAPI parser/risk service & Google Gemini AI)
 */
const getModelStatus = async (req, res) => {
  let fastapiData = { is_ready: false, model_status: 'loading', message: 'Checking models...' };
  let geminiHealth = { available: false, model: 'gemini-3.6-flash', error: 'Checking Gemini...' };

  // 1. Check FastAPI Service
  try {
    const targetUrl = FASTAPI_URL.replace('localhost', '127.0.0.1');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const fastapiRes = await fetch(`${targetUrl}/health/model-status`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (fastapiRes.ok) {
      fastapiData = await fastapiRes.json();
    }
  } catch (err) {
    fastapiData = {
      is_ready: false,
      model_status: 'offline',
      message: 'FastAPI service is offline'
    };
  }

  // 2. Check Gemini AI Service
  try {
    geminiHealth = await checkGeminiHealth();
  } catch (err) {
    geminiHealth = {
      available: false,
      model: 'gemini-3.6-flash',
      error: err.message
    };
  }

  const isAllReady = Boolean(fastapiData.is_ready && geminiHealth.available);
  const isPartiallyReady = Boolean(fastapiData.is_ready || geminiHealth.available);

  return res.status(200).json({
    status: isAllReady ? 'ready' : isPartiallyReady ? 'partial' : 'offline',
    is_ready: isAllReady,
    model_status: isAllReady ? 'ready' : 'loading',
    message: isAllReady
      ? `AI Model & Gemini AI (${geminiHealth.model || 'gemini-3.6-flash'}) ready`
      : !fastapiData.is_ready
      ? 'FastAPI AI microservice is loading...'
      : `Gemini AI service status: ${geminiHealth.error || 'unavailable'}`,
    fastapi: fastapiData,
    gemini: geminiHealth,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  getHealthStatus,
  getModelStatus
};

