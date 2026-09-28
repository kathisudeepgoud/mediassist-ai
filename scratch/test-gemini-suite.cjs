const path = require('path');
require(path.join(__dirname, '../server/node_modules/dotenv')).config({ path: path.join(__dirname, '../server/.env') });

const {
  checkGeminiHealth,
  buildMinimalPatientContext,
  generateReportExplanation,
  generateAssistantChatResponse,
  streamAssistantChatResponse
} = require('../server/services/gemini.service');

async function runGeminiSuite() {
  console.log('=== MedAssist AI Gemini Integration Test Suite ===\n');
  let passed = 0;
  let total = 0;

  function assert(condition, testName, extraInfo = '') {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${extraInfo ? '(' + extraInfo + ')' : ''}`);
    }
  }

  // TEST 1: checkGeminiHealth
  try {
    const health = await checkGeminiHealth();
    console.log('\n--- Test 1: Gemini Health Check ---');
    console.log('Health Status:', health);
    assert(typeof health.available === 'boolean', 'Health check returns available boolean');
    assert(health.model.includes('gemini'), `Health check model is Gemini: ${health.model}`);
    assert(health.provider === 'Google Gemini AI', 'Health check provider is Google Gemini AI');
  } catch (err) {
    assert(false, 'Health check should not throw', err.message);
  }

  // TEST 2: buildMinimalPatientContext (Intent Filtering)
  console.log('\n--- Test 2: Context Intent Filtering ---');
  const samplePatientContext = {
    patient: { name: 'John Doe', age: 45, gender: 'male', bloodGroup: 'O+', dietaryPreference: 'non-vegetarian' },
    conditions: ['Type 2 Diabetes'],
    allergies: ['Peanuts'],
    medications: ['Metformin 500mg'],
    vitals: [
      { label: 'Fasting Blood Glucose', value: '145', unit: 'mg/dL', status: 'high', referenceRange: '70-99' },
      { label: 'Blood Pressure Systolic', value: '125', unit: 'mmHg', status: 'normal', referenceRange: '< 120' },
      { label: 'HbA1c', value: '7.2', unit: '%', status: 'high', referenceRange: '< 5.7' }
    ],
    diseaseRisks: [
      { name: 'Type 2 Diabetes', percentage: 72, status: 'High' }
    ],
    dietPlan: { targetCalories: 2000, healthGoal: 'blood sugar management' },
    latestReport: { type: 'Blood Test', reportDate: '2026-09-20', summary: 'Elevated glucose levels.' }
  };

  const dietQueryContext = buildMinimalPatientContext(samplePatientContext, 'What should I eat for dinner?');
  assert(dietQueryContext.includes('DIET PLAN SUMMARY'), 'Diet query includes DIET PLAN SUMMARY');
  assert(dietQueryContext.includes('Target Calories: 2000'), 'Diet query includes target calories');

  const glucoseQueryContext = buildMinimalPatientContext(samplePatientContext, 'Why is my fasting blood glucose 145?');
  assert(glucoseQueryContext.includes('RELEVANT VITAL MEASUREMENTS'), 'Glucose query includes vitals section');
  assert(glucoseQueryContext.includes('Fasting Blood Glucose: 145 mg/dL'), 'Context includes Fasting Blood Glucose');

  const riskQueryContext = buildMinimalPatientContext(samplePatientContext, 'What is my disease risk?');
  assert(riskQueryContext.includes('DISEASE RISK ASSESSMENTS'), 'Risk query includes disease risk assessment');

  // TEST 3: Report Explanation Failsafe / API Call
  console.log('\n--- Test 3: Report Explanation Logic ---');
  const sampleVitals = [
    { parameter_name: 'Fasting Blood Glucose', value: '145', unit: 'mg/dL', status: 'high', reference_range: '70-99' },
    { parameter_name: 'HbA1c', value: '7.2', unit: '%', status: 'high', reference_range: '< 5.7' },
    { parameter_name: 'Total Cholesterol', value: '180', unit: 'mg/dL', status: 'normal', reference_range: '< 200' }
  ];

  try {
    const explanationResult = await generateReportExplanation({ age: 45, gender: 'male' }, sampleVitals);
    console.log('Report Explanation Result Summary:', explanationResult.summary);
    console.log('Parameters Count:', explanationResult.parameters ? explanationResult.parameters.length : 0);
    assert(typeof explanationResult.summary === 'string', 'Returns summary string');
    assert(Array.isArray(explanationResult.parameters), 'Returns parameters array');
    assert(explanationResult.parameters.length === sampleVitals.length, 'Generates explanation for each parameter');
  } catch (err) {
    assert(false, 'generateReportExplanation should handle gracefully', err.message);
  }

  // TEST 4: Assistant Chat Streaming Callback Test
  console.log('\n--- Test 4: Assistant Chat Streaming ---');
  let streamedText = '';
  let streamCompleted = false;
  let streamErrorHandled = false;

  try {
    await streamAssistantChatResponse(
      samplePatientContext,
      [{ role: 'user', content: 'Hello' }],
      'Give me one tip for managing glucose.',
      {
        onToken: (token) => { streamedText += token; },
        onComplete: () => { streamCompleted = true; },
        onError: (err) => {
          streamErrorHandled = true;
          console.log('Stream Notice (Handled gracefully):', err.message);
        }
      }
    );
    assert(streamCompleted || streamErrorHandled, 'Stream completes or handles API responses gracefully');
  } catch (err) {
    assert(false, 'streamAssistantChatResponse should not throw uncaught error', err.message);
  }

  // TEST 5: Verify no Ollama controller files or imports
  console.log('\n--- Test 5: Verify Architecture Cleanliness ---');
  const fs = require('fs');
  const reportControllerContent = fs.readFileSync(path.join(__dirname, '../server/controllers/report.controller.js'), 'utf8');
  const assistantControllerContent = fs.readFileSync(path.join(__dirname, '../server/controllers/assistant.controller.js'), 'utf8');

  assert(!reportControllerContent.includes('ollama'), 'Report controller has zero ollama references');
  assert(reportControllerContent.includes('gemini.service'), 'Report controller imports gemini.service');
  assert(!assistantControllerContent.includes('ollama'), 'Assistant controller has zero ollama references');
  assert(assistantControllerContent.includes('gemini.service'), 'Assistant controller imports gemini.service');

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} / ${total} passed`);
  console.log(`========================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runGeminiSuite();
