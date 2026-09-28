/**
 * MILP Diet Optimizer Bridge (Node.js -> Python Engine)
 * Dispatches diet optimization requests to the FastAPI Python service (or asynchronous Python CLI runner).
 * Guarantees that Mixed Integer Linear Programming (MILP) is always the engine generating the diet.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const FASTAPI_URL = (process.env.FASTAPI_URL || 'http://127.0.0.1:8000').replace('localhost', '127.0.0.1');
const PYTHON_PATH = process.env.PYTHON_PATH || 'python';

/**
 * Helper to run Python CLI asynchronously without blocking the Node event loop
 */
function runPythonCliAsync(cliScriptPath, tempFilePath) {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON_PATH, [cliScriptPath, tempFilePath]);
    let stdoutData = '';
    let stderrData = '';

    proc.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    proc.on('error', (err) => {
      reject(new Error(`Python MILP runner execution failed to start: ${err.message}`));
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python MILP runner exited with code ${code}: ${stderrData || stdoutData}`));
      }
      try {
        const outputJson = JSON.parse(stdoutData);
        if (outputJson.error || outputJson.success === false) {
          return reject(new Error(outputJson.error || 'MILP Optimization failed'));
        }
        resolve(outputJson);
      } catch (parseErr) {
        reject(new Error(`Failed to parse MILP JSON response: ${parseErr.message}. Output: ${stdoutData.slice(0, 300)}`));
      }
    });
  });
}

async function optimizeWithMILP(payload) {
  // 1. First attempt fast HTTP dispatch to FastAPI service (with 45s timeout for full 7-day MILP)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const response = await fetch(`${FASTAPI_URL}/api/v1/diet/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (httpErr) {
    // FastAPI HTTP service not listening or timed out, proceed seamlessly to async direct Python runner
  }

  // 2. Direct Python CLI Runner execution via temp file (100% asynchronous, non-blocking)
  const tempFilePath = path.join(os.tmpdir(), `milp_diet_req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.json`);
  try {
    const cliScriptPath = path.resolve(__dirname, '../../../fastapi-service/services/diet/cli_runner.py');
    fs.writeFileSync(tempFilePath, JSON.stringify(payload), 'utf-8');

    const outputJson = await runPythonCliAsync(cliScriptPath, tempFilePath);
    return outputJson;
  } catch (cliErr) {
    throw new Error(`MILP Diet Optimization failure: ${cliErr.message}`);
  } finally {
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (_) {}
  }
}

module.exports = { optimizeWithMILP };
