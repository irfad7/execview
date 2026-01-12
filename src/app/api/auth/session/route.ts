import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('session')?.value;

        if (!sessionToken) {
            return NextResponse.json(
                { user: null, sessionToken: null },
                { status: 200 }
            );
        }

        const user = await AuthService.validateSession(sessionToken);

        if (!user) {
            // Session is invalid, clear the cookie
            cookieStore.delete('session');
            return NextResponse.json(
                { user: null, sessionToken: null },
                { status: 200 }
            );
        }

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            },
            sessionToken
        });

    } catch (error) {
        console.error('Session validation error:', error);
        return NextResponse.json(
            { error: 'Session validation failed' },
            { status: 500 }
        );
    }
}