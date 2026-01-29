# Test Reporter

A test reporting system for CDP-based smoke tests. Captures test results as JSON and displays them in a GitHub Pages dashboard.

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Claude runs     │ --> │ Results JSON │ --> │ GitHub Pages    │
│ tests via CDP   │     │ saved locally│     │ (dashboard +    │
│ MCP tools       │     │              │     │  historical     │
└─────────────────┘     └──────────────┘     │  results)       │
                                             └─────────────────┘
```

## Files

- `results-schema.js` - Defines JSON structure for test results
- `test-runner.js` - Utilities for executing tests and processing results
- `save-results.js` - CLI script to save results and push to GitHub
- `index.js` - Main module entry point

## Usage

### Saving Results

```bash
# Save results locally
node save-results.js results.json

# Save and push to GitHub
node save-results.js results.json --push

# Read from stdin
echo '{"runId":"..."}' | node save-results.js --stdin

# Clean up old results (keeps last 50)
node save-results.js --cleanup
```

### Results JSON Structure

```json
{
  "runId": "2024-01-29T10-30-00-000Z",
  "timestamp": 1706523000000,
  "startedAt": "2024-01-29T10:30:00.000Z",
  "completedAt": "2024-01-29T10:30:45.000Z",
  "duration": 45000,
  "summary": {
    "total": 10,
    "passed": 9,
    "failed": 1,
    "skipped": 0,
    "passRate": 90
  },
  "environment": {
    "app": "Airtime Camera",
    "version": "1.0.0",
    "platform": "darwin",
    "cdpPort": 9222
  },
  "tests": [
    {
      "name": "Page Load Verification",
      "description": "...",
      "status": "passed",
      "duration": 2500,
      "steps": [
        {
          "name": "Check page info",
          "status": "passed",
          "duration": 150,
          "result": { "title": "Airtime Camera" },
          "expected": { "title": "Airtime Camera" }
        }
      ]
    }
  ]
}
```

## How Claude Uses This

When running tests via CDP MCP tools, Claude:

1. Connects to the app via `cdp_connect(port: 9222)`
2. Selects the Camera page via `cdp_select_page(selector: "Camera")`
3. Executes each test step via `cdp_evaluate(expression: step.run)`
4. Compares results against expected values
5. Collects all results into the JSON structure
6. Saves to `docs/results/{timestamp}.json`
7. Optionally commits and pushes to GitHub

## Dashboard

The dashboard is located at `docs/index.html` and displays:

- **Summary cards**: Total tests, passed, failed, pass rate, duration
- **Trend chart**: Pass rate over last 20 runs
- **Run selector**: Pick historical runs to view
- **Test list**: Expandable rows with step details
- **Filter**: Show all, passed only, or failed only

### Setting Up GitHub Pages

1. Go to repository Settings > Pages
2. Set Source to "Deploy from a branch"
3. Select `main` branch and `/docs` folder
4. Save

The dashboard will be available at `https://<username>.github.io/<repo>/`
