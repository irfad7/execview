import { NextResponse } from 'next/server';

// Debug endpoint to see what OAuth URL we're generating for QuickBooks
export async function GET() {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Remove any trailing slash from baseUrl
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const redirectUri = `${cleanBaseUrl}/api/auth/callback/quickbooks`;

    const authUrl = 'https://appcenter.intuit.com/connect/oauth2';
    const scopes = 'com.intuit.quickbooks.accounting openid profile email';

    const url = new URL(authUrl);
    url.searchParams.append('client_id', clientId || 'NOT_SET');
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('scope', scopes);
    url.searchParams.append('state', 'debug_test');

    return NextResponse.json({
        info: "This shows what OAuth URL we're generating",
        environment: {
            NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'NOT SET - using fallback',
            QUICKBOOKS_CLIENT_ID: clientId ? `${clientId.substring(0, 10)}...` : 'NOT SET',
            QUICKBOOKS_CLIENT_SECRET: process.env.QUICKBOOKS_CLIENT_SECRET ? 'SET' : 'NOT SET',
        },
        generatedRedirectUri: redirectUri,
        fullAuthUrl: url.toString(),
        instructions: {
            step1: "Copy the 'generatedRedirectUri' value",
            step2: "Make sure this EXACT value is in your Intuit Developer Portal under Production > Redirect URIs",
            step3: "No trailing slashes, exact case match required"
        }
    });
}
