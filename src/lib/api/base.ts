// Decoupled from DB for multi-tenancy
// Access tokens are passed in from the service layer

export interface OAuthTokens {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

export abstract class BaseConnector {
    abstract serviceName: string;
    protected accessToken: string | null;

    constructor(accessToken?: string | null) {
        this.accessToken = accessToken || null;
    }

    abstract fetchMetrics(): Promise<any>;
}
