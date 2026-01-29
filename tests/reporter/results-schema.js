/**
 * Test Results Schema
 *
 * Defines the JSON structure for test results that can be consumed
 * by the dashboard and stored as historical records.
 */

/**
 * Creates a new test run result object
 * @param {Object} options - Run configuration
 * @returns {Object} Test run result structure
 */
function createTestRun(options = {}) {
  const now = new Date();
  return {
    runId: now.toISOString().replace(/[:.]/g, '-'),
    timestamp: now.getTime(),
    startedAt: now.toISOString(),
    completedAt: null,
    duration: 0,
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      passRate: 0
    },
    environment: {
      app: options.app || 'Airtime Camera',
      version: options.version || 'unknown',
      platform: options.platform || process.platform || 'unknown',
      cdpPort: options.cdpPort || 9222,
      nodeVersion: typeof process !== 'undefined' ? process.version : 'unknown'
    },
    tests: []
  };
}

/**
 * Creates a test result object
 * @param {Object} testDef - Test definition from smoke-tests.js
 * @returns {Object} Test result structure
 */
function createTestResult(testDef) {
  return {
    name: testDef.name,
    description: testDef.description || '',
    status: 'pending', // pending, running, passed, failed, skipped
    startedAt: null,
    completedAt: null,
    duration: 0,
    steps: [],
    error: null
  };
}

/**
 * Creates a step result object
 * @param {Object} stepDef - Step definition from test
 * @returns {Object} Step result structure
 */
function createStepResult(stepDef) {
  return {
    name: stepDef.name,
    status: 'pending', // pending, running, passed, failed, skipped
    startedAt: null,
    completedAt: null,
    duration: 0,
    result: null,         // Raw result from CDP evaluate
    expected: stepDef.expect || null,
    verification: null,   // Result of verify step if present
    verifyExpected: stepDef.verifyExpect || null,
    error: null,
    errorDetails: null
  };
}

/**
 * Updates run summary based on test results
 * @param {Object} run - Test run object
 * @returns {Object} Updated run object
 */
function updateRunSummary(run) {
  const tests = run.tests;
  run.summary.total = tests.length;
  run.summary.passed = tests.filter(t => t.status === 'passed').length;
  run.summary.failed = tests.filter(t => t.status === 'failed').length;
  run.summary.skipped = tests.filter(t => t.status === 'skipped').length;
  run.summary.passRate = run.summary.total > 0
    ? Math.round((run.summary.passed / run.summary.total) * 100)
    : 0;
  return run;
}

/**
 * Finalizes a test run (sets completion time and duration)
 * @param {Object} run - Test run object
 * @returns {Object} Finalized run object
 */
function finalizeRun(run) {
  const now = new Date();
  run.completedAt = now.toISOString();
  run.duration = now.getTime() - run.timestamp;
  return updateRunSummary(run);
}

/**
 * Compares actual result against expected values
 * @param {Object} actual - Actual result from CDP
 * @param {Object} expected - Expected values
 * @returns {Object} Comparison result
 */
function compareResults(actual, expected) {
  if (!expected) return { matches: true, failures: [] };

  const failures = [];
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = actual ? actual[key] : undefined;
    if (actualValue !== expectedValue) {
      failures.push({
        key,
        expected: expectedValue,
        actual: actualValue
      });
    }
  }

  return {
    matches: failures.length === 0,
    failures
  };
}

/**
 * Formats duration in human-readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Generates a filename for the results JSON
 * @param {Object} run - Test run object
 * @returns {string} Filename
 */
function generateFilename(run) {
  return `${run.runId}.json`;
}

// Example result structure for documentation
const EXAMPLE_RESULT = {
  runId: "2024-01-29T10-30-00-000Z",
  timestamp: 1706523000000,
  startedAt: "2024-01-29T10:30:00.000Z",
  completedAt: "2024-01-29T10:30:45.000Z",
  duration: 45000,
  summary: {
    total: 10,
    passed: 9,
    failed: 1,
    skipped: 0,
    passRate: 90
  },
  environment: {
    app: "Airtime Camera",
    version: "1.2.3",
    platform: "darwin",
    cdpPort: 9222,
    nodeVersion: "v18.0.0"
  },
  tests: [
    {
      name: "Page Load Verification",
      description: "Verify the Camera page loads with all essential UI elements",
      status: "passed",
      startedAt: "2024-01-29T10:30:00.000Z",
      completedAt: "2024-01-29T10:30:02.500Z",
      duration: 2500,
      steps: [
        {
          name: "Check page info",
          status: "passed",
          startedAt: "2024-01-29T10:30:00.000Z",
          completedAt: "2024-01-29T10:30:00.150Z",
          duration: 150,
          result: { url: "file:///camera.html", title: "Airtime Camera", readyState: "complete" },
          expected: { title: "Airtime Camera", readyState: "complete" },
          verification: null,
          verifyExpected: null,
          error: null,
          errorDetails: null
        }
      ],
      error: null
    }
  ]
};

module.exports = {
  createTestRun,
  createTestResult,
  createStepResult,
  updateRunSummary,
  finalizeRun,
  compareResults,
  formatDuration,
  generateFilename,
  EXAMPLE_RESULT
};
