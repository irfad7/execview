import { NextResponse } from 'next/server';

const CONFIGS = {
    clio: {
        authUrl: 'https://app.clio.com/oauth/authorize',
        tokenUrl: 'https://app.clio.com/oauth/token',
        scopes: 'openid', // Adjust based on needs
    },
    gohighlevel: {
        authUrl: 'https://marketplace.gohighlevel.com/oauth/chooselocation',
        tokenUrl: 'https://services.leadconnectorhq.com/oauth/token',
        scopes: 'contacts.readonly contacts.write opportunities.readonly calendars.readonly',
    },
    quickbooks: {
        authUrl: 'https://appcenter.intuit.com/connect/oauth2',
        tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
        scopes: 'com.intuit.quickbooks.accounting openid profile email',
    }
};

export async function GET(
    request: Request,
    { params }: { params: Promise<{ service: string }> }
) {
    const { service: serviceParam } = await params;
    const service = serviceParam.toLowerCase();
    const config = CONFIGS[service as keyof typeof CONFIGS];

    if (!config) {
        return NextResponse.json({ error: 'Unsupported service' }, { status: 400 });
    }

    const clientId = process.env[`${service.toUpperCase()}_CLIENT_ID`];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/auth/callback/${service}`;

    const url = new URL(config.authUrl);
    url.searchParams.append('client_id', clientId || '');
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('scope', config.scopes);
    url.searchParams.append('state', Math.random().toString(36).substring(7));

    return NextResponse.redirect(url.toString());
}
