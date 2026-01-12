import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import bcrypt from 'bcryptjs';

export interface User {
    id: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Session {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
}

// Session management
export class AuthService {
    private static SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

    static async createUser(email: string, password: string): Promise<User> {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword
            }
        });
        
        return {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
    }

    static async verifyPassword(password: string, email?: string): Promise<User | null> {
        // For single firm system, get the first user (should only be one)
        // If email provided, use it for backward compatibility
        let user;
        if (email) {
            user = await prisma.user.findUnique({
                where: { email }
            });
        } else {
            // Get the first user (single firm system)
            user = await prisma.user.findFirst();
        }
        
        if (!user) return null;
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;
        
        return {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
    }

    // New method for password-only authentication (single firm)
    static async authenticateWithPassword(password: string): Promise<User | null> {
        return this.verifyPassword(password);
    }

    // Method to update password
    static async updatePassword(userId: string, newPassword: string): Promise<boolean> {
        try {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await prisma.user.update({
                where: { id: userId },
                data: { password: hashedPassword }
            });
            return true;
        } catch (error) {
            console.error('Failed to update password:', error);
            return false;
        }
    }

    // Initialize default user if none exists
    static async ensureDefaultUser(): Promise<void> {
        const userCount = await prisma.user.count();
        if (userCount === 0) {
            await this.createUser('admin@mylegalacademy.com', 'MLA@2026');
            console.log('Default user created with password: MLA@2026');
        }
    }

    static async createSession(userId: string): Promise<string> {
        // Generate crypto-random token using Web Crypto API (Edge Runtime compatible)
        const tokenBuffer = new Uint8Array(32);
        crypto.getRandomValues(tokenBuffer);
        const token = Array.from(tokenBuffer, byte => byte.toString(16).padStart(2, '0')).join('');
        const expiresAt = new Date(Date.now() + this.SESSION_DURATION);
        
        // Clean up existing sessions for this user
        await prisma.session.deleteMany({
            where: { userId }
        });
        
        // Create new session
        await prisma.session.create({
            data: {
                userId,
                token,
                expiresAt
            }
        });
        
        return token;
    }

    static async validateSession(token: string): Promise<User | null> {
        const session = await prisma.session.findUnique({
            where: { token },
            include: {
                user: true
            }
        });
        
        if (!session || session.expiresAt < new Date()) {
            if (session) {
                await prisma.session.delete({ where: { id: session.id } });
            }
            return null;
        }
        
        return {
            id: session.user.id,
            email: session.user.email,
            createdAt: session.user.createdAt,
            updatedAt: session.user.updatedAt
        };
    }

    static async deleteSession(token: string): Promise<void> {
        await prisma.session.deleteMany({
            where: { token }
        });
    }

    static async getUserById(userId: string): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        
        if (!user) return null;
        
        return {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
    }

    // Cleanup expired sessions (run periodically)
    static async cleanupExpiredSessions(): Promise<void> {
        await prisma.session.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date()
                }
            }
        });
    }
}