import { z } from 'zod';
import { cdpClient } from '../cdp-client.js';
export function registerConnectionTools(server) {
    server.tool('cdp_connect', 'Connect to a CDP endpoint (Chrome DevTools Protocol). Default port is 9222.', { port: z.number().optional().describe('CDP port (default: 9222)') }, async ({ port }) => {
        try {
            const message = await cdpClient.connect(port ?? 9222);
            const targets = await cdpClient.listTargets();
            const pageList = targets
                .filter(t => t.type === 'page')
                .map((t, i) => `  ${i}: ${t.title} (${t.url})`)
                .join('\n');
            return {
                content: [{
                        type: 'text',
                        text: `${message}\n\nAvailable pages:\n${pageList || '  (no pages found)'}`,
                    }],
            };
        }
        catch (error) {
            return {
                content: [{ type: 'text', text: `Error: ${error}` }],
                isError: true,
            };
        }
    });
    server.tool('cdp_disconnect', 'Disconnect from the current CDP session', {}, async () => {
        const message = await cdpClient.disconnect();
        return {
            content: [{ type: 'text', text: message }],
        };
    });
    server.tool('cdp_status', 'Get the current CDP connection status', {}, async () => {
        const status = cdpClient.getStatus();
        let text = `Connected: ${status.connected}\n`;
        text += `Port: ${status.port}\n`;
        text += `Selected Target: ${status.selectedTarget || 'none'}\n`;
        text += `Collected Logs: ${status.logCount}`;
        if (status.connected) {
            try {
                const targets = await cdpClient.listTargets();
                const pageList = targets
                    .filter(t => t.type === 'page')
                    .map((t, i) => `  ${i}: ${t.title} (${t.url})`)
                    .join('\n');
                text += `\n\nAvailable pages:\n${pageList || '  (no pages found)'}`;
            }
            catch {
                // Ignore errors listing targets
            }
        }
        return {
            content: [{ type: 'text', text }],
        };
    });
}
