import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session_token')?.value;

        if (token) {
            await AuthService.deleteSession(token);
        }

        // Clear the cookie
        cookieStore.delete('session_token');

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json(
            { error: 'Logout failed' },
            { status: 500 }
        );
    }
}