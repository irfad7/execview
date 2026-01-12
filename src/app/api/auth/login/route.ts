import { NextRequest, NextResponse } from 'next/server';
import { SimpleAuthService } from '@/lib/simple-auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        // Ensure default user exists
        await SimpleAuthService.ensureDefaultUser();
        
        const { email, password } = await request.json();

        if (!password) {
            return NextResponse.json(
                { error: 'Password is required' },
                { status: 400 }
            );
        }

        // Use password-only authentication for single firm system
        const user = await SimpleAuthService.authenticateWithPassword(password);
        
        if (!user) {
            return NextResponse.json(
                { error: 'Invalid password' },
                { status: 401 }
            );
        }

        const token = await SimpleAuthService.createSession(user.id);
        
        // Set HTTP-only cookie with correct name 'session' (not 'session_token')
        const cookieStore = await cookies();
        cookieStore.set('session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 // 7 days
        });

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Login failed' },
            { status: 500 }
        );
    }
}