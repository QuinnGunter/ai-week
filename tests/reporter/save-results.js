#!/usr/bin/env node

/**
 * Save Test Results Script
 *
 * Saves test results to the docs/results directory and optionally
 * pushes to GitHub to update the GitHub Pages dashboard.
 *
 * Usage:
 *   node save-results.js <results.json>           # Save locally only
 *   node save-results.js <results.json> --push    # Save and push to GitHub
 *   node save-results.js --stdin                  # Read results from stdin
 *   node save-results.js --stdin --push           # Read from stdin and push
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DOCS_DIR = path.join(__dirname, '..', '..', 'docs');
const RESULTS_DIR = path.join(DOCS_DIR, 'results');

/**
 * Ensures the results directory exists
 */
function ensureResultsDir() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    console.log(`Created results directory: ${RESULTS_DIR}`);
  }
}

/**
 * Reads test results from file or stdin
 * @param {string} source - File path or '--stdin'
 * @returns {Object} Parsed test results
 */
function readResults(source) {
  if (source === '--stdin') {
    const input = fs.readFileSync(0, 'utf8');
    return JSON.parse(input);
  }
  const content = fs.readFileSync(source, 'utf8');
  return JSON.parse(content);
}

/**
 * Generates a filename from the run ID
 * @param {Object} results - Test results object
 * @returns {string} Filename
 */
function getFilename(results) {
  const runId = results.runId || new Date().toISOString().replace(/[:.]/g, '-');
  return `${runId}.json`;
}

/**
 * Saves results to the docs/results directory
 * @param {Object} results - Test results object
 * @returns {string} Path to saved file
 */
function saveResults(results) {
  ensureResultsDir();
  const filename = getFilename(results);
  const filepath = path.join(RESULTS_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
  console.log(`Saved results to: ${filepath}`);
  return filepath;
}

/**
 * Updates the results index file for the dashboard
 * @returns {Array} List of result files
 */
function updateResultsIndex() {
  ensureResultsDir();

  const files = fs.readdirSync(RESULTS_DIR)
    .filter(f => f.endsWith('.json') && f !== 'index.json')
    .sort()
    .reverse(); // Most recent first

  const index = {
    updatedAt: new Date().toISOString(),
    count: files.length,
    files: files.map(f => {
      const filepath = path.join(RESULTS_DIR, f);
      const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      return {
        filename: f,
        runId: content.runId,
        timestamp: content.timestamp,
        summary: content.summary
      };
    })
  };

  const indexPath = path.join(RESULTS_DIR, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`Updated results index: ${indexPath}`);

  return files;
}

/**
 * Commits and pushes results to GitHub
 * @param {string} filepath - Path to the saved results file
 */
function pushToGitHub(filepath) {
  const repoRoot = path.join(__dirname, '..', '..');

  try {
    // Stage the results file and index
    execSync(`git add "${filepath}" "${path.join(RESULTS_DIR, 'index.json')}"`, {
      cwd: repoRoot,
      stdio: 'inherit'
    });

    // Get the run ID for commit message
    const results = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    const passRate = results.summary?.passRate || 0;
    const total = results.summary?.total || 0;
    const passed = results.summary?.passed || 0;

    // Create commit
    const message = `Test results: ${passed}/${total} passed (${passRate}%)`;
    execSync(`git commit -m "${message}"`, {
      cwd: repoRoot,
      stdio: 'inherit'
    });

    // Push to remote
    execSync('git push', {
      cwd: repoRoot,
      stdio: 'inherit'
    });

    console.log('\nResults pushed to GitHub successfully!');
    console.log('Dashboard will update shortly at your GitHub Pages URL.');
  } catch (error) {
    console.error('\nFailed to push to GitHub:', error.message);
    console.log('Results were saved locally. You can push manually with:');
    console.log(`  cd "${repoRoot}" && git add docs/results && git commit -m "Add test results" && git push`);
    process.exit(1);
  }
}

/**
 * Cleans up old result files, keeping only the most recent N
 * @param {number} keepCount - Number of files to keep (default: 50)
 */
function cleanupOldResults(keepCount = 50) {
  ensureResultsDir();

  const files = fs.readdirSync(RESULTS_DIR)
    .filter(f => f.endsWith('.json') && f !== 'index.json')
    .sort()
    .reverse();

  if (files.length > keepCount) {
    const toDelete = files.slice(keepCount);
    for (const file of toDelete) {
      fs.unlinkSync(path.join(RESULTS_DIR, file));
      console.log(`Deleted old result: ${file}`);
    }
  }
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage:
  node save-results.js <results.json>           Save results locally
  node save-results.js <results.json> --push    Save and push to GitHub
  node save-results.js --stdin                  Read results from stdin
  node save-results.js --stdin --push           Read from stdin and push
  node save-results.js --cleanup                Clean up old results (keep 50)

Options:
  --push      Push results to GitHub after saving
  --stdin     Read results JSON from stdin
  --cleanup   Remove old result files
  --help, -h  Show this help message
`);
    process.exit(0);
  }

  if (args.includes('--cleanup')) {
    cleanupOldResults();
    updateResultsIndex();
    process.exit(0);
  }

  // Determine source
  const source = args.includes('--stdin') ? '--stdin' : args[0];
  const shouldPush = args.includes('--push');

  if (!source || source.startsWith('--')) {
    console.error('Error: No results file specified');
    process.exit(1);
  }

  try {
    // Read and save results
    const results = readResults(source);
    const filepath = saveResults(results);

    // Update index
    updateResultsIndex();

    // Cleanup old results
    cleanupOldResults();

    // Push if requested
    if (shouldPush) {
      pushToGitHub(filepath);
    }

    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = {
  ensureResultsDir,
  saveResults,
  updateResultsIndex,
  pushToGitHub,
  cleanupOldResults
};

// Run if called directly
if (require.main === module) {
  main();
}
