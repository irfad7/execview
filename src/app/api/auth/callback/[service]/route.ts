import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '@/lib/auth';

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
    const realmIdFromUrl = searchParams.get('realmId'); // QuickBooks sends realmId in callback URL
    const { service: serviceParam } = await params;
    const service = serviceParam.toLowerCase();
    const config = CONFIGS[service as keyof typeof CONFIGS];

    console.log(`OAuth callback for ${service}: code=${code ? 'present' : 'missing'}, realmId=${realmIdFromUrl || 'not in URL'}`);

    // Get authenticated user
    const sessionToken = request.cookies.get('session')?.value;
    if (!sessionToken) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    
    const user = await AuthService.validateSession(sessionToken);
    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (!code) {
        return NextResponse.redirect(new URL('/integrations?error=no_code', request.url));
    }

    if (!config) {
        return NextResponse.redirect(new URL('/integrations?error=unsupported_service', request.url));
    }

    try {
        const clientId = config.id;
        const clientSecret = config.secret;
        // Remove any trailing slash to ensure exact match
        const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
        const redirectUri = `${baseUrl}/api/auth/callback/${service}`;

        console.log(`OAuth ${service}: Using redirect_uri = ${redirectUri}`);

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

        // Get realmId - QuickBooks sends it in the callback URL, GHL sends locationId in token response
        const realmId = realmIdFromUrl || data.realmId || data.locationId || data.location_id || null;

        console.log(`OAuth ${service}: Storing tokens. realmId=${realmId}, expiresAt=${expiresAt}`);

        // Update DB via Prisma
        await prisma.apiConfig.upsert({
            where: {
                service_userId: {
                    service: service,
                    userId: user.id
                }
            },
            update: {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                realmId: realmId,
                expiresAt: expiresAt,
                isActive: true,
                updatedAt: new Date()
            },
            create: {
                service: service,
                userId: user.id,
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                realmId: realmId,
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
