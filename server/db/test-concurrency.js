const { optimizeWithMILP } = require('../services/diet/milpOptimizerBridge');

async function testConcurrency() {
  console.log('================================================================');
  console.log('   MEDASSIST AI — ASYNC NON-BLOCKING CONCURRENCY BENCHMARK      ');
  console.log('================================================================\n');

  const dietPayload = {
    patientProfile: {
      name: 'Concurrent Test Patient',
      age: 52,
      gender: 'Male',
      heightCm: 172.0,
      weightKg: 78.0,
      activity_level: 'Moderately Active',
      health_goal: 'Weight Loss'
    },
    clinicalVitals: {
      fasting_sugar: 145,
      hba1c: 7.2,
      sysBP: 138,
      diaBP: 88,
      cholesterol: 220
    },
    diseaseRisks: [
      { id: 'diabetes', name: 'Diabetes', status: 'High', percentage: 72 },
      { id: 'heart', name: 'Heart Disease', status: 'Moderate', percentage: 48 }
    ],
    preferences: {
      diet_type: 'Vegetarian',
      food_preference: 'All',
      meal_count: 5,
      allergies: ['peanut']
    },
    days: 7
  };

  for (let cycle = 1; cycle <= 3; cycle++) {
    console.log(`--- [Cycle ${cycle}/3] Testing Concurrent Responsiveness ---`);
    const startTime = Date.now();

    // 1. Launch 7-day MILP Diet Generation in the background
    console.log('  1. Starting 7-day MILP optimization in background...');
    const dietPromise = optimizeWithMILP(dietPayload);

    // 2. While MILP is running, fire 10 concurrent requests to Express & FastAPI
    await new Promise(r => setTimeout(r, 200)); // wait 200ms for solver to be active
    console.log('  2. Firing 10 concurrent API requests while MILP solver is active...');

    const concurrentEndpoints = [
      'http://localhost:5000/api/health',
      'http://localhost:5000/api/health/model-status',
      'http://127.0.0.1:8000/health',
      'http://127.0.0.1:8000/api/v1/diet/health',
      'http://localhost:5000/api/health',
      'http://localhost:5000/api/health/model-status',
      'http://127.0.0.1:8000/health',
      'http://127.0.0.1:8000/api/v1/diet/health',
      'http://localhost:5000/api/health',
      'http://localhost:5000/api/health/model-status'
    ];

    const concurrentStart = Date.now();
    const concurrentResults = await Promise.all(
      concurrentEndpoints.map(async (url, idx) => {
        const reqStart = Date.now();
        try {
          const res = await fetch(url);
          const elapsed = Date.now() - reqStart;
          return { idx, url, ok: res.ok, status: res.status, elapsed };
        } catch (err) {
          return { idx, url, ok: false, error: err.message, elapsed: Date.now() - reqStart };
        }
      })
    );
    const concurrentTotal = Date.now() - concurrentStart;

    const allPassed = concurrentResults.every(r => r.ok && r.elapsed < 500);
    const avgLatency = Math.round(concurrentResults.reduce((a, b) => a + b.elapsed, 0) / concurrentResults.length);

    console.log(`  -> All 10 concurrent requests responded in parallel in ${concurrentTotal}ms (Avg latency: ${avgLatency}ms)`);
    if (!allPassed) {
      console.error('  [FAIL] Some concurrent requests failed or took > 500ms:', concurrentResults);
      process.exit(1);
    } else {
      console.log('  -> [PASS] Express and FastAPI event loops are 100% non-blocking!');
    }

    // 3. Await MILP diet plan completion
    console.log('  3. Waiting for MILP 7-day plan completion...');
    const dietResult = await dietPromise;
    const totalCycleTime = Date.now() - startTime;

    console.log(`  -> [PASS] Diet plan completed in ${totalCycleTime}ms (Weekly days: ${dietResult.weeklyPlan?.length}, Safety: ${dietResult.safety?.safetyStatus})\n`);
  }

  console.log('================================================================');
  console.log('  RESULT: ALL 3 CONCURRENCY CYCLES PASSED WITHOUT BLOCKING!    ');
  console.log('================================================================');
}

testConcurrency().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
