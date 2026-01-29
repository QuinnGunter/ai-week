export interface ConsoleMessage {
    level: string;
    text: string;
    timestamp: number;
    source?: string;
    url?: string;
    line?: number;
}
export interface PageTarget {
    id: string;
    title: string;
    url: string;
    type: string;
}
export declare class CDPClient {
    private client;
    private port;
    private logs;
    private selectedTargetId;
    isConnected(): boolean;
    getPort(): number;
    getSelectedTargetId(): string | null;
    connect(port?: number, targetId?: string): Promise<string>;
    disconnect(): Promise<string>;
    listTargets(): Promise<PageTarget[]>;
    selectPage(indexOrPattern: number | string): Promise<string>;
    getLogs(level?: string): ConsoleMessage[];
    clearLogs(): number;
    evaluate(expression: string): Promise<any>;
    getAccessibilitySnapshot(): Promise<any>;
    private formatAccessibilityTree;
    getStatus(): {
        connected: boolean;
        port: number;
        selectedTarget: string | null;
        logCount: number;
    };
}
export declare const cdpClient: CDPClient;
