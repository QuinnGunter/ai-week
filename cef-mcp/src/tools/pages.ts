import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { cdpClient } from '../cdp-client.js';

export function registerPageTools(server: McpServer): void {
  server.tool(
    'cdp_list_pages',
    'List all available pages/targets from the CDP endpoint',
    {},
    async () => {
      try {
        const targets = await cdpClient.listTargets();

        if (targets.length === 0) {
          return {
            content: [{ type: 'text', text: 'No targets found.' }],
          };
        }

        const selectedId = cdpClient.getSelectedTargetId();
        const formatted = targets.map((t, i) => {
          const selected = t.id === selectedId ? ' (selected)' : '';
          return `${i}: [${t.type}] ${t.title}\n   URL: ${t.url}\n   ID: ${t.id}${selected}`;
        }).join('\n\n');

        return {
          content: [{ type: 'text', text: formatted }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'cdp_select_page',
    'Select a page to interact with by index number or pattern match on title/URL',
    {
      selector: z.union([z.number(), z.string()])
        .describe('Page index (0-based) or search pattern for title/URL'),
    },
    async ({ selector }) => {
      try {
        const message = await cdpClient.selectPage(selector);
        return {
          content: [{ type: 'text', text: message }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );
}
