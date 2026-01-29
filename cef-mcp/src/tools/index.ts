import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerConnectionTools } from './connection.js';
import { registerConsoleTools } from './console.js';
import { registerPageTools } from './pages.js';
import { registerInteractionTools } from './interaction.js';

export function registerAllTools(server: McpServer): void {
  registerConnectionTools(server);
  registerConsoleTools(server);
  registerPageTools(server);
  registerInteractionTools(server);
}
