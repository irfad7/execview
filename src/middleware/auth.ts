import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { cookies } from 'next/headers';

export interface AuthenticatedRequest extends NextRequest {
    user?: {
        id: string;
        email: string;
    };
}

export async function requireAuth(request: NextRequest): Promise<{ user: { id: string; email: string } } | NextResponse> {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    
    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    
    const user = await AuthService.validateSession(token);
    
    if (!user) {
        // Clear invalid cookie
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('session_token');
        return response;
    }
    
    return { user: { id: user.id, email: user.email } };
}

export async function getAuthenticatedUser(request: NextRequest): Promise<{ id: string; email: string } | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    
    if (!token) return null;
    
    const user = await AuthService.validateSession(token);
    return user ? { id: user.id, email: user.email } : null;
}