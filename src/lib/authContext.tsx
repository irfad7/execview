"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
    user: User | null;
    session: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    isAuthenticated: false,
    loading: true,
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    // Check for existing session on mount
    useEffect(() => {
        const checkSession = async () => {
            try {
                const response = await fetch('/api/auth/session', {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.user) {
                        setUser(data.user);
                        setSession(data.sessionToken || 'authenticated');
                    }
                }
            } catch (error) {
                console.error('Session check failed:', error);
            } finally {
                setLoading(false);
            }
        };

        checkSession();
    }, []);

    const signOut = async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            
            setUser(null);
            setSession(null);
            router.push('/login');
        } catch (error) {
            console.error('Sign out failed:', error);
        }
    };

    // Protected route logic
    useEffect(() => {
        if (!loading) {
            if (!session && pathname !== '/login') {
                router.push('/login');
            } else if (session && pathname === '/login') {
                router.push('/');
            }
        }
    }, [session, loading, pathname, router]);

    return (
        <AuthContext.Provider value={{ user, session, isAuthenticated: !!session, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
