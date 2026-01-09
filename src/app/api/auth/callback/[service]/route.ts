import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    request: NextRequest,
    { params }: { params: Promise<{ service: string }> }
) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const { service: serviceParam } = await params;
    const service = serviceParam.toLowerCase();
    const config = CONFIGS[service as keyof typeof CONFIGS];

    // Simplified auth check - get session token from cookie
    const sessionToken = request.cookies.get('session')?.value;
    if (!sessionToken) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // TODO: Validate session token and get user ID
    const userId = 'demo-user-id'; // Placeholder until auth validation is implemented

    if (!code) {
        return NextResponse.redirect(new URL('/integrations?error=no_code', request.url));
    }

    if (!config) {
        return NextResponse.redirect(new URL('/integrations?error=unsupported_service', request.url));
    }

    try {
        const clientId = config.id;
        const clientSecret = config.secret;
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const redirectUri = `${baseUrl}/api/auth/callback/${service}`;

        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            // For GHL, we might need client_id/secret in body
        });

        if (service === 'execview') {
            params.append('client_id', clientId || '');
            params.append('client_secret', clientSecret || '');
        }

        const response = await fetch(config.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                // QuickBooks requires Basic Auth, GHL accepts it too mostly (but we send body there)
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
            },
            body: params,
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Token Exchange Error:', data);
            return NextResponse.redirect(new URL(`/integrations?error=token_exchange_failed&details=${encodeURIComponent(data.error_description || data.error || 'Unknown error')}`, request.url));
        }

        const expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in || 3600);

        // Update DB via Prisma
        await prisma.apiConfig.upsert({
            where: {
                service_userId: {
                    service: service,
                    userId: userId
                }
            },
            update: {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: expiresAt,
                isActive: true,
                updatedAt: new Date()
            },
            create: {
                service: service,
                userId: userId,
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: expiresAt,
                isActive: true,
                updatedAt: new Date()
            }
        });

        return NextResponse.redirect(new URL('/integrations?success=1', request.url));
    } catch (err) {
        console.error('OAuth Callback Error:', err);
        return NextResponse.redirect(new URL(`/integrations?error=callback_failed&details=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`, request.url));
    }
}
