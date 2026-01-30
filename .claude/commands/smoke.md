# Run Smoke Tests

Launch the Airtime app with remote debugging enabled, connect via CDP, and run smoke tests.

## Steps

1. **Launch the Airtime app** with remote debugging:
   ```bash
   open /Applications/airtime.app --args --remote-debugging-port=9222 --user-data-dir=remote-profile --enable-logging --v=1
   ```

2. **Open Chrome DevTools inspector** to view available targets:
   ```bash
   open -a "Google Chrome" "chrome://inspect/#devices"
   ```

3. **Wait a few seconds** for the app to start up (use `sleep 3` or similar)

4. **Connect to the app via CDP** using the `mcp__cef-cdp__cdp_connect` tool on port 9222

5. **List available pages** using `mcp__cef-cdp__cdp_list_pages` to verify connection

6. **Select the Camera page** using `mcp__cef-cdp__cdp_select_page` with selector "Camera"

7. **Run the smoke tests** by executing test steps via `mcp__cef-cdp__cdp_evaluate`:
   - Load test definitions from `tests/smoke-tests.js`
   - Execute each test suite (Page Load, Looks, Name Tag, Away Mode, Filters, etc.)
   - Track pass/fail status for each step

8. **Report the results** - display a summary table showing:
   - Test name, status (pass/fail/partial), and details
   - Overall summary: total tests, passed, failed, pass rate

9. **Save results to GitHub Pages dashboard** (MUST ask user first):
   - Use `AskUserQuestion` to ask: "Would you like to save these results to the GitHub Pages dashboard?"
   - Options: "Yes, save locally only", "Yes, save and push to GitHub", "No, skip saving"
   - If user confirms:
     a. Detect repo root: `git rev-parse --show-toplevel`
     b. Check if `docs/results/` directory exists
     c. If missing, ask user if they want to create it
     d. Format results as JSON (see Results JSON Format below)
     e. Save to `docs/results/{timestamp}.json`
     f. Update `docs/results/index.json`
     g. If "push to GitHub" selected: `git add docs/results && git commit -m "Test results: X/Y passed (Z%)" && git push`

If connection fails, retry a couple times with short delays as the app may still be starting.

## Results JSON Format

```json
{
  "runId": "2026-01-30T10-30-00-000Z",
  "timestamp": 1706523000000,
  "startedAt": "2026-01-30T10:30:00.000Z",
  "completedAt": "2026-01-30T10:30:45.000Z",
  "duration": 45000,
  "summary": {
    "total": 10,
    "passed": 7,
    "failed": 3,
    "skipped": 0,
    "passRate": 70
  },
  "environment": {
    "app": "Airtime Camera",
    "platform": "darwin",
    "cdpPort": 9222
  },
  "tests": [
    {
      "name": "Page Load Verification",
      "status": "passed|failed|partial",
      "steps": [
        { "name": "Step name", "pass": true, "result": {} }
      ]
    }
  ]
}
```

## Notes

- The `docs/` folder should be configured as GitHub Pages source (Settings > Pages > Deploy from branch > /docs)
- Results are kept for historical trending (last 50 runs)
- Dashboard URL: `https://<username>.github.io/<repo>/`
