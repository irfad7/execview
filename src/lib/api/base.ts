import db from "../db"; // Assuming we might want to expose internal DB if needed

export interface OAuthTokens {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

export abstract class BaseConnector {
    abstract serviceName: string;

    protected async getTokens() {
        // Fetch from SQLite api_configs
        return null;
    }

    protected async saveTokens(tokens: OAuthTokens) {
        // Save to SQLite api_configs
    }

    abstract fetchMetrics(): Promise<any>;
}
