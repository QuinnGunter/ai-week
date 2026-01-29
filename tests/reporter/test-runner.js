/**
 * Test Runner for CDP-based Smoke Tests
 *
 * This module provides utilities for executing tests via CDP and capturing
 * results in a structured format for the dashboard.
 *
 * Usage:
 *   Claude runs tests by calling CDP MCP tools directly.
 *   This module provides the JavaScript code and result collection helpers.
 */

const {
  createTestRun,
  createTestResult,
  createStepResult,
  compareResults,
  finalizeRun,
  formatDuration
} = require('./results-schema');

/**
 * JavaScript code that can be evaluated via CDP to check for UI errors
 */
const CHECK_FOR_ERRORS_JS = `(() => {
  const errors = [];
  const banner = document.getElementById('notifications-banner');
  if (banner) {
    const errorNotifs = banner.querySelectorAll('.notification--error, .notification-error, [data-type="error"]');
    errorNotifs.forEach(n => {
      if (n.textContent.trim()) errors.push('Notification: ' + n.textContent.trim());
    });
  }
  const errorModals = document.querySelectorAll('.modal--error, .error-modal, [role="alertdialog"]');
  errorModals.forEach(m => {
    const style = window.getComputedStyle(m);
    if (style.display !== 'none' && style.visibility !== 'hidden') {
      errors.push('Modal: ' + m.textContent.trim().substring(0, 100));
    }
  });
  return { hasError: errors.length > 0, errors };
})()`;

/**
 * JavaScript code to reset UI state before tests
 */
const RESET_UI_STATE_JS = `(() => {
  const actions = [];
  const closeBtn = document.querySelector('[data-action="close-widget"]');
  if (closeBtn) {
    const style = window.getComputedStyle(closeBtn);
    if (style.display !== 'none' && style.visibility !== 'hidden') {
      closeBtn.click();
      actions.push('Closed widget');
    }
  }
  const dismissBtns = document.querySelectorAll('[data-action="dismiss-notification"], .notification__close');
  dismissBtns.forEach(btn => {
    const style = window.getComputedStyle(btn);
    if (style.display !== 'none') {
      btn.click();
      actions.push('Dismissed notification');
    }
  });
  return { success: true, actions };
})()`;

/**
 * Generates instructions for Claude to execute a single test step via CDP
 * @param {Object} step - Step definition from smoke-tests.js
 * @returns {Object} Execution instructions
 */
function getStepInstructions(step) {
  const instructions = {
    stepName: step.name,
    actions: []
  };

  // Main action
  instructions.actions.push({
    type: 'evaluate',
    description: `Execute: ${step.name}`,
    code: step.run,
    captureAs: 'result'
  });

  // Wait for condition if specified
  if (step.waitFor) {
    instructions.actions.push({
      type: 'waitFor',
      description: 'Wait for condition',
      code: step.waitFor,
      timeout: step.waitTimeout || 3000
    });
  } else {
    instructions.actions.push({
      type: 'wait',
      description: 'Wait for UI to stabilize',
      delay: 150
    });
  }

  // Error check
  instructions.actions.push({
    type: 'evaluate',
    description: 'Check for errors',
    code: CHECK_FOR_ERRORS_JS,
    captureAs: 'errors'
  });

  // Verification if specified
  if (step.verify) {
    instructions.actions.push({
      type: 'evaluate',
      description: 'Verify state',
      code: step.verify,
      captureAs: 'verification'
    });
  }

  // Expected values
  instructions.expected = step.expect || {};
  instructions.verifyExpected = step.verifyExpect || null;

  return instructions;
}

/**
 * Processes raw CDP results into a step result object
 * @param {Object} step - Step definition
 * @param {Object} rawResults - Raw results from CDP evaluation
 * @returns {Object} Processed step result
 */
function processStepResult(step, rawResults) {
  const stepResult = createStepResult(step);
  const now = new Date();

  stepResult.startedAt = rawResults.startedAt || now.toISOString();
  stepResult.completedAt = rawResults.completedAt || now.toISOString();
  stepResult.duration = rawResults.duration || 0;
  stepResult.result = rawResults.result;
  stepResult.verification = rawResults.verification || null;

  // Check for UI errors
  if (rawResults.errors && rawResults.errors.hasError) {
    stepResult.status = 'failed';
    stepResult.error = 'UI error detected';
    stepResult.errorDetails = rawResults.errors.errors;
    return stepResult;
  }

  // Compare main result against expected
  const mainComparison = compareResults(rawResults.result, step.expect);
  if (!mainComparison.matches) {
    stepResult.status = 'failed';
    stepResult.error = 'Expected values did not match';
    stepResult.errorDetails = mainComparison.failures;
    return stepResult;
  }

  // Compare verification result against expected
  if (step.verify && step.verifyExpect) {
    const verifyComparison = compareResults(rawResults.verification, step.verifyExpect);
    if (!verifyComparison.matches) {
      stepResult.status = 'failed';
      stepResult.error = 'Verification failed';
      stepResult.errorDetails = verifyComparison.failures;
      return stepResult;
    }
  }

  stepResult.status = 'passed';
  return stepResult;
}

/**
 * Processes test results from multiple steps
 * @param {Object} testDef - Test definition from smoke-tests.js
 * @param {Array} stepResults - Array of processed step results
 * @returns {Object} Complete test result
 */
function processTestResult(testDef, stepResults) {
  const testResult = createTestResult(testDef);
  testResult.steps = stepResults;

  // Calculate timing from steps
  if (stepResults.length > 0) {
    testResult.startedAt = stepResults[0].startedAt;
    testResult.completedAt = stepResults[stepResults.length - 1].completedAt;
    testResult.duration = stepResults.reduce((sum, s) => sum + (s.duration || 0), 0);
  }

  // Determine test status based on step results
  const failedSteps = stepResults.filter(s => s.status === 'failed');
  if (failedSteps.length > 0) {
    testResult.status = 'failed';
    testResult.error = `${failedSteps.length} step(s) failed`;
  } else {
    testResult.status = 'passed';
  }

  return testResult;
}

/**
 * Creates a complete test run from executed test results
 * @param {Array} testResults - Array of test result objects
 * @param {Object} options - Run options (app, version, etc.)
 * @returns {Object} Complete test run object
 */
function createCompletedRun(testResults, options = {}) {
  const run = createTestRun(options);
  run.tests = testResults;
  return finalizeRun(run);
}

/**
 * Generates a summary for console output
 * @param {Object} run - Completed test run
 * @returns {string} Summary text
 */
function generateSummary(run) {
  const lines = [
    '',
    '═══════════════════════════════════════════════════════════',
    `  Test Run Summary: ${run.runId}`,
    '═══════════════════════════════════════════════════════════',
    '',
    `  Total: ${run.summary.total}  |  Passed: ${run.summary.passed}  |  Failed: ${run.summary.failed}  |  Skipped: ${run.summary.skipped}`,
    `  Pass Rate: ${run.summary.passRate}%`,
    `  Duration: ${formatDuration(run.duration)}`,
    '',
  ];

  // Add test breakdown
  lines.push('  Test Results:');
  lines.push('  ─────────────────────────────────────────────────────────');

  for (const test of run.tests) {
    const icon = test.status === 'passed' ? '✓' : test.status === 'failed' ? '✗' : '○';
    const status = test.status.toUpperCase().padEnd(7);
    lines.push(`  ${icon} [${status}] ${test.name} (${formatDuration(test.duration)})`);

    if (test.status === 'failed' && test.error) {
      lines.push(`              └─ ${test.error}`);
    }
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Generates markdown report for a test run
 * @param {Object} run - Completed test run
 * @returns {string} Markdown report
 */
function generateMarkdownReport(run) {
  const lines = [
    `# Test Run Report`,
    '',
    `**Run ID:** ${run.runId}`,
    `**Date:** ${new Date(run.timestamp).toLocaleString()}`,
    `**Duration:** ${formatDuration(run.duration)}`,
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Tests | ${run.summary.total} |`,
    `| Passed | ${run.summary.passed} |`,
    `| Failed | ${run.summary.failed} |`,
    `| Skipped | ${run.summary.skipped} |`,
    `| Pass Rate | ${run.summary.passRate}% |`,
    '',
    '## Environment',
    '',
    `- **App:** ${run.environment.app}`,
    `- **Version:** ${run.environment.version}`,
    `- **Platform:** ${run.environment.platform}`,
    '',
    '## Test Results',
    ''
  ];

  for (const test of run.tests) {
    const icon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️';
    lines.push(`### ${icon} ${test.name}`);
    lines.push('');
    lines.push(`**Status:** ${test.status} | **Duration:** ${formatDuration(test.duration)}`);
    lines.push('');

    if (test.description) {
      lines.push(`> ${test.description}`);
      lines.push('');
    }

    if (test.steps.length > 0) {
      lines.push('<details>');
      lines.push('<summary>Step Details</summary>');
      lines.push('');
      lines.push('| Step | Status | Duration |');
      lines.push('|------|--------|----------|');

      for (const step of test.steps) {
        const stepIcon = step.status === 'passed' ? '✓' : step.status === 'failed' ? '✗' : '○';
        lines.push(`| ${stepIcon} ${step.name} | ${step.status} | ${formatDuration(step.duration)} |`);
      }

      lines.push('');
      lines.push('</details>');
      lines.push('');
    }

    if (test.status === 'failed' && test.error) {
      lines.push(`**Error:** ${test.error}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

module.exports = {
  CHECK_FOR_ERRORS_JS,
  RESET_UI_STATE_JS,
  getStepInstructions,
  processStepResult,
  processTestResult,
  createCompletedRun,
  generateSummary,
  generateMarkdownReport
};
