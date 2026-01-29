/**
 * Test Reporter Module
 *
 * Main entry point for the test reporting system.
 * Exports all necessary functions for running tests and saving results.
 */

const resultsSchema = require('./results-schema');
const testRunner = require('./test-runner');
const saveResults = require('./save-results');

module.exports = {
  // Results schema
  createTestRun: resultsSchema.createTestRun,
  createTestResult: resultsSchema.createTestResult,
  createStepResult: resultsSchema.createStepResult,
  updateRunSummary: resultsSchema.updateRunSummary,
  finalizeRun: resultsSchema.finalizeRun,
  compareResults: resultsSchema.compareResults,
  formatDuration: resultsSchema.formatDuration,
  generateFilename: resultsSchema.generateFilename,

  // Test runner
  CHECK_FOR_ERRORS_JS: testRunner.CHECK_FOR_ERRORS_JS,
  RESET_UI_STATE_JS: testRunner.RESET_UI_STATE_JS,
  getStepInstructions: testRunner.getStepInstructions,
  processStepResult: testRunner.processStepResult,
  processTestResult: testRunner.processTestResult,
  createCompletedRun: testRunner.createCompletedRun,
  generateSummary: testRunner.generateSummary,
  generateMarkdownReport: testRunner.generateMarkdownReport,

  // Save results
  ensureResultsDir: saveResults.ensureResultsDir,
  saveResults: saveResults.saveResults,
  updateResultsIndex: saveResults.updateResultsIndex,
  pushToGitHub: saveResults.pushToGitHub,
  cleanupOldResults: saveResults.cleanupOldResults
};
