import { z } from 'zod';
import { cdpClient } from '../cdp-client.js';
export function registerInteractionTools(server) {
    server.tool('cdp_evaluate', 'Execute JavaScript on the selected page and return the result', {
        expression: z.string().describe('JavaScript expression to evaluate'),
    }, async ({ expression }) => {
        try {
            const result = await cdpClient.evaluate(expression);
            let formatted;
            if (result === undefined) {
                formatted = 'undefined';
            }
            else if (result === null) {
                formatted = 'null';
            }
            else if (typeof result === 'object') {
                formatted = JSON.stringify(result, null, 2);
            }
            else {
                formatted = String(result);
            }
            return {
                content: [{ type: 'text', text: formatted }],
            };
        }
        catch (error) {
            return {
                content: [{ type: 'text', text: `Error: ${error}` }],
                isError: true,
            };
        }
    });
    server.tool('cdp_snapshot', 'Get an accessibility snapshot of the current page', {}, async () => {
        try {
            const snapshot = await cdpClient.getAccessibilitySnapshot();
            return {
                content: [{ type: 'text', text: snapshot }],
            };
        }
        catch (error) {
            return {
                content: [{ type: 'text', text: `Error: ${error}` }],
                isError: true,
            };
        }
    });
}
