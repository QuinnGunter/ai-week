import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { cdpClient } from '../cdp-client.js';

export function registerConsoleTools(server: McpServer): void {
  server.tool(
    'cdp_get_logs',
    'Get console messages collected from the CDP session. Optionally filter by level.',
    {
      level: z.enum(['log', 'info', 'warning', 'error', 'debug', 'verbose'])
        .optional()
        .describe('Filter logs by level'),
      limit: z.number().optional().describe('Maximum number of logs to return (default: 100)'),
    },
    async ({ level, limit }) => {
      if (!cdpClient.isConnected()) {
        return {
          content: [{ type: 'text', text: 'Not connected to CDP. Use cdp_connect first.' }],
          isError: true,
        };
      }

      const logs = cdpClient.getLogs(level);
      const maxLogs = limit ?? 100;
      const recentLogs = logs.slice(-maxLogs);

      if (recentLogs.length === 0) {
        return {
          content: [{ type: 'text', text: 'No logs collected.' }],
        };
      }

      const formatted = recentLogs.map(log => {
        const time = new Date(log.timestamp).toISOString().slice(11, 23);
        let line = `[${time}] [${log.level.toUpperCase()}] ${log.text}`;
        if (log.url) {
          line += ` (${log.url}${log.line ? `:${log.line}` : ''})`;
        }
        return line;
      }).join('\n');

      const header = logs.length > maxLogs
        ? `Showing last ${maxLogs} of ${logs.length} logs:\n\n`
        : `${logs.length} logs:\n\n`;

      return {
        content: [{ type: 'text', text: header + formatted }],
      };
    }
  );

  server.tool(
    'cdp_clear_logs',
    'Clear all collected console logs',
    {},
    async () => {
      const count = cdpClient.clearLogs();
      return {
        content: [{ type: 'text', text: `Cleared ${count} log entries.` }],
      };
    }
  );
}
