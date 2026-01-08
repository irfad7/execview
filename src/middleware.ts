import { NextResponse, type NextRequest } from 'next/server'
import { AuthService } from '@/lib/auth'

export async function middleware(request: NextRequest) {
    // Skip auth for login page and API auth routes
    if (request.nextUrl.pathname.startsWith('/login') || 
        request.nextUrl.pathname.startsWith('/api/auth/login')) {
        return NextResponse.next()
    }

    // Check if user is authenticated
    const token = request.cookies.get('session_token')?.value

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Validate session
    const user = await AuthService.validateSession(token)
    
    if (!user) {
        // Clear invalid cookie and redirect
        const response = NextResponse.redirect(new URL('/login', request.url))
        response.cookies.delete('session_token')
        return response
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
