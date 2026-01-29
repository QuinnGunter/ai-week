import CDP from 'chrome-remote-interface';
export class CDPClient {
    client = null;
    port = 9222;
    logs = [];
    selectedTargetId = null;
    isConnected() {
        return this.client !== null;
    }
    getPort() {
        return this.port;
    }
    getSelectedTargetId() {
        return this.selectedTargetId;
    }
    async connect(port = 9222, targetId) {
        if (this.client) {
            await this.disconnect();
        }
        this.port = port;
        this.logs = [];
        try {
            // If no target specified, get list of targets and pick the first page
            if (!targetId) {
                const targets = await this.listTargets();
                const pageTarget = targets.find(t => t.type === 'page');
                if (pageTarget) {
                    targetId = pageTarget.id;
                }
            }
            const options = { port };
            if (targetId) {
                options.target = targetId;
                this.selectedTargetId = targetId;
            }
            this.client = await CDP(options);
            // Enable domains we need
            await this.client.Console.enable();
            await this.client.Runtime.enable();
            await this.client.Page.enable();
            // Collect console messages from Console domain
            this.client.Console.messageAdded(({ message }) => {
                this.logs.push({
                    level: message.level,
                    text: message.text,
                    timestamp: Date.now(),
                    source: message.source,
                    url: message.url,
                    line: message.line,
                });
            });
            // Also collect from Runtime domain for console API calls
            this.client.Runtime.consoleAPICalled(({ type, args, timestamp }) => {
                const text = args.map(arg => {
                    if (arg.value !== undefined)
                        return String(arg.value);
                    if (arg.description)
                        return arg.description;
                    return arg.type;
                }).join(' ');
                this.logs.push({
                    level: type,
                    text,
                    timestamp: timestamp || Date.now(),
                    source: 'console-api',
                });
            });
            // Handle disconnection
            this.client.on('disconnect', () => {
                this.client = null;
                this.selectedTargetId = null;
            });
            const targetInfo = targetId ? ` (target: ${targetId})` : '';
            return `Connected to CDP on port ${port}${targetInfo}`;
        }
        catch (error) {
            this.client = null;
            throw new Error(`Failed to connect to CDP on port ${port}: ${error}`);
        }
    }
    async disconnect() {
        if (!this.client) {
            return 'Not connected';
        }
        try {
            await this.client.close();
        }
        catch {
            // Ignore close errors
        }
        this.client = null;
        this.selectedTargetId = null;
        this.logs = [];
        return 'Disconnected from CDP';
    }
    async listTargets() {
        try {
            const targets = await CDP.List({ port: this.port });
            return targets.map((t) => ({
                id: t.id,
                title: t.title,
                url: t.url,
                type: t.type,
            }));
        }
        catch (error) {
            throw new Error(`Failed to list targets: ${error}`);
        }
    }
    async selectPage(indexOrPattern) {
        const targets = await this.listTargets();
        const pages = targets.filter(t => t.type === 'page');
        let target;
        if (typeof indexOrPattern === 'number') {
            target = pages[indexOrPattern];
            if (!target) {
                throw new Error(`Page index ${indexOrPattern} out of range (0-${pages.length - 1})`);
            }
        }
        else {
            const pattern = indexOrPattern.toLowerCase();
            target = pages.find(p => p.title.toLowerCase().includes(pattern) ||
                p.url.toLowerCase().includes(pattern));
            if (!target) {
                throw new Error(`No page matching pattern: ${indexOrPattern}`);
            }
        }
        // Reconnect to the selected target
        await this.connect(this.port, target.id);
        return `Selected page: ${target.title} (${target.url})`;
    }
    getLogs(level) {
        if (!level) {
            return [...this.logs];
        }
        return this.logs.filter(log => log.level === level);
    }
    clearLogs() {
        const count = this.logs.length;
        this.logs = [];
        return count;
    }
    async evaluate(expression) {
        if (!this.client) {
            throw new Error('Not connected to CDP. Use cdp_connect first.');
        }
        try {
            const result = await this.client.Runtime.evaluate({
                expression,
                returnByValue: true,
                awaitPromise: true,
            });
            if (result.exceptionDetails) {
                throw new Error(result.exceptionDetails.text || 'Evaluation failed');
            }
            return result.result.value;
        }
        catch (error) {
            throw new Error(`Evaluation failed: ${error}`);
        }
    }
    async getAccessibilitySnapshot() {
        if (!this.client) {
            throw new Error('Not connected to CDP. Use cdp_connect first.');
        }
        try {
            // Enable Accessibility domain
            await this.client.Accessibility.enable();
            // Get the full accessibility tree
            const { nodes } = await this.client.Accessibility.getFullAXTree();
            return this.formatAccessibilityTree(nodes);
        }
        catch (error) {
            throw new Error(`Failed to get accessibility snapshot: ${error}`);
        }
    }
    formatAccessibilityTree(nodes) {
        if (!nodes || nodes.length === 0) {
            return 'No accessibility tree available';
        }
        const lines = [];
        const nodeMap = new Map();
        // Build node map
        for (const node of nodes) {
            nodeMap.set(node.nodeId, node);
        }
        // Format each node
        const formatNode = (node, indent = 0) => {
            const role = node.role?.value || 'unknown';
            const name = node.name?.value || '';
            const value = node.value?.value || '';
            // Skip ignored nodes
            if (node.ignored)
                return;
            let line = '  '.repeat(indent);
            line += `[${role}]`;
            if (name)
                line += ` "${name}"`;
            if (value)
                line += ` value="${value}"`;
            lines.push(line);
            // Process children
            if (node.childIds) {
                for (const childId of node.childIds) {
                    const child = nodeMap.get(childId);
                    if (child) {
                        formatNode(child, indent + 1);
                    }
                }
            }
        };
        // Find and format root nodes
        const rootNodes = nodes.filter(n => !n.parentId);
        for (const root of rootNodes) {
            formatNode(root);
        }
        return lines.join('\n') || 'Empty accessibility tree';
    }
    getStatus() {
        return {
            connected: this.isConnected(),
            port: this.port,
            selectedTarget: this.selectedTargetId,
            logCount: this.logs.length,
        };
    }
}
// Singleton instance for the MCP server
export const cdpClient = new CDPClient();
