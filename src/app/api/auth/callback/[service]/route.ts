import { NextResponse } from 'next/server';
import db from '@/lib/db';

const CONFIGS = {
    clio: {
        id: process.env.CLIO_CLIENT_ID,
        secret: process.env.CLIO_CLIENT_SECRET,
        tokenUrl: 'https://app.clio.com/oauth/token',
    },
    execview: { // GoHighLevel
        id: process.env.GOHIGHLEVEL_CLIENT_ID,
        secret: process.env.GOHIGHLEVEL_CLIENT_SECRET,
        tokenUrl: 'https://services.leadconnectorhq.com/oauth/token',
    },
    quickbooks: {
        id: process.env.QUICKBOOKS_CLIENT_ID,
        secret: process.env.QUICKBOOKS_CLIENT_SECRET,
        tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    }
};

export async function GET(
    request: Request,
    { params }: { params: Promise<{ service: string }> }
) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const { service: serviceParam } = await params;
    const service = serviceParam.toLowerCase();
    const config = CONFIGS[service as keyof typeof CONFIGS];

    if (!code) {
        return NextResponse.redirect(new URL('/admin?error=no_code', request.url));
    }

    if (!config) {
        return NextResponse.redirect(new URL('/admin?error=unsupported_service', request.url));
    }

    try {
        const clientId = config.id;
        const clientSecret = config.secret;
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const redirectUri = `${baseUrl}/api/auth/callback/${service}`;

        const response = await fetch(config.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Token Exchange Error:', data);
            return NextResponse.redirect(new URL(`/admin?error=token_exchange_failed&details=${encodeURIComponent(data.error_description || data.error || 'Unknown error')}`, request.url));
        }

        const expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in || 3600);

        db.prepare(`
            UPDATE api_configs 
            SET access_token = ?, refresh_token = ?, expires_at = ?
            WHERE id = ?
        `).run(data.access_token, data.refresh_token, expiresAt, service);

        return NextResponse.redirect(new URL('/admin?success=1', request.url));
    } catch (err) {
        console.error('OAuth Callback Error:', err);
        return NextResponse.redirect(new URL('/admin?error=callback_failed', request.url));
    }
}
