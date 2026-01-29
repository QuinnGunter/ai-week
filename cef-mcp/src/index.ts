#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllTools } from './tools/index.js';
import { cdpClient } from './cdp-client.js';

const server = new McpServer({
  name: 'cef-cdp',
  version: '0.1.0',
});

// Register all CDP tools
registerAllTools(server);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await cdpClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cdpClient.disconnect();
  process.exit(0);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
