import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Token refresh configurations for each service
const TOKEN_CONFIGS = {
    clio: {
        tokenUrl: 'https://app.clio.com/oauth/token',
        clientId: process.env.CLIO_CLIENT_ID,
        clientSecret: process.env.CLIO_CLIENT_SECRET,
        useBasicAuth: true,
    },
    execview: { // GoHighLevel
        tokenUrl: 'https://services.leadconnectorhq.com/oauth/token',
        clientId: process.env.GOHIGHLEVEL_CLIENT_ID,
        clientSecret: process.env.GOHIGHLEVEL_CLIENT_SECRET,
        useBasicAuth: false, // GHL prefers credentials in body
    },
    quickbooks: {
        tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
        clientId: process.env.QUICKBOOKS_CLIENT_ID,
        clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
        useBasicAuth: true,
    }
};

// Buffer time before expiration to trigger refresh (5 minutes)
const REFRESH_BUFFER_SECONDS = 300;

export interface TokenRefreshResult {
    success: boolean;
    accessToken?: string;
    error?: string;
    refreshed?: boolean;
}

/**
 * Check if a token needs refresh based on expiration time
 */
export function tokenNeedsRefresh(expiresAt: number | null): boolean {
    if (!expiresAt) return true; // No expiration info, assume needs refresh

    const now = Math.floor(Date.now() / 1000);
    return now >= (expiresAt - REFRESH_BUFFER_SECONDS);
}

/**
 * Refresh OAuth token for a given service
 */
export async function refreshToken(
    service: string,
    refreshTokenValue: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number } | null> {
    const config = TOKEN_CONFIGS[service as keyof typeof TOKEN_CONFIGS];

    if (!config) {
        console.error(`No token config for service: ${service}`);
        return null;
    }

    if (!config.clientId || !config.clientSecret) {
        console.error(`Missing OAuth credentials for service: ${service}`);
        return null;
    }

    try {
        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshTokenValue,
        });

        // GHL requires credentials in the body
        if (!config.useBasicAuth) {
            params.append('client_id', config.clientId);
            params.append('client_secret', config.clientSecret);
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };

        // Add Basic Auth header for services that require it
        if (config.useBasicAuth) {
            headers['Authorization'] = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`;
        }

        console.log(`Refreshing ${service} token...`);

        const response = await fetch(config.tokenUrl, {
            method: 'POST',
            headers,
            body: params,
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(`Token refresh failed for ${service}:`, data);
            return null;
        }

        const expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in || 3600);

        console.log(`Successfully refreshed ${service} token, expires in ${data.expires_in}s`);

        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || refreshTokenValue, // Some services don't return new refresh token
            expiresAt,
        };
    } catch (error) {
        console.error(`Token refresh error for ${service}:`, error);
        return null;
    }
}

/**
 * Get valid access token for a service, refreshing if necessary
 * This is the main function to use in API routes
 */
export async function getValidAccessToken(
    service: string,
    userId: string
): Promise<TokenRefreshResult> {
    try {
        // Get current token from database
        const apiConfig = await prisma.apiConfig.findUnique({
            where: {
                service_userId: {
                    service,
                    userId,
                }
            }
        });

        if (!apiConfig) {
            return { success: false, error: `No ${service} integration configured` };
        }

        if (!apiConfig.accessToken) {
            return { success: false, error: `No access token for ${service}` };
        }

        // Check if token needs refresh
        if (!tokenNeedsRefresh(apiConfig.expiresAt)) {
            // Token is still valid
            return { success: true, accessToken: apiConfig.accessToken, refreshed: false };
        }

        // Token expired or expiring soon - need to refresh
        if (!apiConfig.refreshToken) {
            return {
                success: false,
                error: `${service} token expired and no refresh token available. Please reconnect the integration.`
            };
        }

        // Attempt to refresh the token
        const newTokens = await refreshToken(service, apiConfig.refreshToken);

        if (!newTokens) {
            return {
                success: false,
                error: `Failed to refresh ${service} token. Please reconnect the integration.`
            };
        }

        // Update database with new tokens
        await prisma.apiConfig.update({
            where: {
                service_userId: {
                    service,
                    userId,
                }
            },
            data: {
                accessToken: newTokens.accessToken,
                refreshToken: newTokens.refreshToken,
                expiresAt: newTokens.expiresAt,
                updatedAt: new Date(),
            }
        });

        console.log(`Updated ${service} tokens in database for user ${userId}`);

        return { success: true, accessToken: newTokens.accessToken, refreshed: true };

    } catch (error) {
        console.error(`Error getting valid access token for ${service}:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error getting access token'
        };
    }
}

/**
 * Get valid access token with realm ID (for QuickBooks and GHL)
 */
export async function getValidAccessTokenWithRealm(
    service: string,
    userId: string
): Promise<TokenRefreshResult & { realmId?: string | null }> {
    const result = await getValidAccessToken(service, userId);

    if (!result.success) {
        return result;
    }

    // Get realm ID from database
    const apiConfig = await prisma.apiConfig.findUnique({
        where: {
            service_userId: {
                service,
                userId,
            }
        },
        select: { realmId: true }
    });

    return { ...result, realmId: apiConfig?.realmId };
}

/**
 * Batch refresh all tokens for a user that are expiring soon
 * Useful for proactive maintenance
 */
export async function refreshAllExpiringTokens(userId: string): Promise<Record<string, TokenRefreshResult>> {
    const results: Record<string, TokenRefreshResult> = {};
    const services = ['clio', 'execview', 'quickbooks'];

    for (const service of services) {
        try {
            const apiConfig = await prisma.apiConfig.findUnique({
                where: {
                    service_userId: { service, userId }
                }
            });

            if (!apiConfig || !apiConfig.isActive) {
                results[service] = { success: false, error: 'Not configured' };
                continue;
            }

            if (!tokenNeedsRefresh(apiConfig.expiresAt)) {
                results[service] = { success: true, refreshed: false };
                continue;
            }

            results[service] = await getValidAccessToken(service, userId);
        } catch (error) {
            results[service] = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    return results;
}
