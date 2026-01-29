# AI Week - Test Automation Prototyping

Exploring AI-assisted test automation for the Airtime desktop app. This repository demonstrates using Claude Code with custom MCP tools to interact with, test, and develop features for a CEF (Chromium Embedded Framework) application.

## What's New (AI Week Additions)

### Test Automation & AI Tooling

| Directory | Description |
|-----------|-------------|
| `cef-mcp/` | Custom MCP server enabling Claude to interact with the running Airtime app via Chrome DevTools Protocol |
| `tests/` | CDP-based smoke test suite covering core Camera features |
| `CLAUDE.md` | Project context file for Claude Code |
| `.mcp.json` | MCP server configuration |

### Feature Development

| File | Description |
|------|-------------|
| `LUT_IMPLEMENTATION_PLAN.md` | Professional color grading effects (LUT) system design - supports .cube, .3dl, .csp, .look formats with WebGL shader rendering |
| `TEST_RESTRUCTURE_PLAN.md` | Comprehensive test architecture plan with feature-specific page objects |

---

## How It Works

Claude Code connects to the running Airtime desktop app via CDP (Chrome DevTools Protocol), enabling interactive testing and development:

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Claude Code    │  MCP    │   cef-mcp       │   CDP   │  Airtime App    │
│  (AI Assistant) │ ──────▶ │   (Node.js)     │ ──────▶ │  (CEF/Chromium) │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

1. Launch Airtime with CDP enabled (port 9222)
2. Claude Code auto-connects via the cef-mcp server
3. Claude can evaluate JavaScript, inspect the UI, click elements, check state, and run tests

---

## Repository Structure

```
├── cef-mcp/                     # MCP server for CDP interaction (NEW)
│   ├── src/
│   │   ├── index.ts             # Server entry point
│   │   ├── cdp-client.ts        # CDP connection management
│   │   └── tools/               # MCP tool implementations
│   └── package.json
│
├── tests/                       # CDP smoke tests (NEW)
│   ├── smoke-tests.js           # 10 test suites, 30+ test steps
│   ├── helpers.js               # Reusable test utilities
│   ├── TEST_PLAN.md             # Test coverage checklist
│   └── run-smoke-tests.md       # Ready-to-run test snippets
│
├── CLAUDE.md                    # Project context for Claude (NEW)
├── .mcp.json                    # MCP server config (NEW)
├── LUT_IMPLEMENTATION_PLAN.md   # Color grading feature design (NEW)
├── TEST_RESTRUCTURE_PLAN.md     # Test architecture plan (NEW)
│
├── mmhmm-camera-development/    # Web UI layer (TypeScript/JS)
│   ├── teleport/                # Camera page source
│   └── tests/                   # Playwright browser tests
│
└── mmhmm-hybrid/                # Desktop app (CEF + native)
    ├── mac/                     # macOS native code
    └── win/                     # Windows native code
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Airtime desktop app installed

### 1. Build the MCP Server

```bash
cd cef-mcp
npm install
npm run build
```

### 2. Launch Airtime with CDP Enabled

```bash
# macOS
open /Applications/airtime.app --args --remote-debugging-port=9222 --user-data-dir=remote-profile
```

### 3. Use Claude Code

The `.mcp.json` config auto-registers the cef-mcp server. Claude Code will have access to CDP tools when working in this directory.

---

## MCP Tools Available

Once connected, Claude has access to these tools for interacting with the Airtime app:

| Tool | Description |
|------|-------------|
| `cdp_connect` | Connect to CDP endpoint (default port 9222) |
| `cdp_disconnect` | Disconnect from the current session |
| `cdp_status` | Get connection status and available pages |
| `cdp_list_pages` | List all available pages/targets |
| `cdp_select_page` | Select a page by index or title pattern |
| `cdp_evaluate` | Execute JavaScript and return the result |
| `cdp_snapshot` | Get accessibility tree snapshot |
| `cdp_get_logs` | Retrieve collected console messages |
| `cdp_clear_logs` | Clear collected logs |

### Example Usage

```
# Connect to the app
> cdp_connect

# Select the Camera page
> cdp_select_page "Camera"

# Check if Looks feature is enabled
> cdp_evaluate "document.querySelector('[data-action=\"toggle-looks-on\"]')?.classList.contains('active')"

# Get all available action buttons
> cdp_evaluate "Array.from(document.querySelectorAll('[data-action]')).map(e => e.dataset.action)"
```

---

## Running Smoke Tests

The `tests/` directory contains comprehensive smoke tests for the Camera page. Tests are defined as JavaScript objects with steps that can be executed via `cdp_evaluate`.

### Test Coverage

1. **Page Load Verification** - Core UI elements present
2. **Sidebar Widget Toggle** - Widget open/close behavior
3. **Looks Feature** - Looks enable/disable, selection
4. **Nametag Feature** - Nametag configuration
5. **Away Mode** - Away screen functionality
6. **Enhance Feature** - Video enhancement controls
7. **LUT/Color Grading** - Color effect application
8. **Edge Light** - Edge lighting effects
9. **Virtual Camera** - Output status verification
10. **Error Handling** - Console error monitoring

### Running Tests with Claude

Ask Claude to run the smoke tests:

```
"Run the smoke tests for the Camera page"
"Check if the Looks feature is working"
"Verify all toolbar buttons are present"
```

Claude will connect via CDP, execute the test steps, and report results.

---

## Existing Projects

### mmhmm-camera-development

Web UI source code and Playwright tests for the Camera page:

```bash
cd mmhmm-camera-development
npm install
npm test          # Run Playwright tests
npm run dev       # Start dev server
```

### mmhmm-hybrid

CEF desktop application with native (C++/Objective-C/Swift) and web layers. See `mmhmm-hybrid/README.md` for build instructions.

---

## Key Learnings

1. **MCP + CDP is powerful** - Custom MCP servers can bridge AI assistants to any Chrome-based app
2. **CEF apps are testable** - Same CDP protocol works for Electron, CEF, and Chrome
3. **Interactive development** - Claude can explore, test, and modify the app in real-time
4. **AI-assisted test writing** - Describe what to test, Claude generates and runs the tests
