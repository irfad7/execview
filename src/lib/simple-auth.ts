import bcrypt from 'bcryptjs';

export interface SimpleUser {
    id: string;
    email: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface SimpleSession {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
}

// In-memory storage (for demo purposes)
let users: SimpleUser[] = [];
let sessions: SimpleSession[] = [];

// Initialize default user
async function initDefaultUser() {
    if (users.length === 0) {
        const hashedPassword = await bcrypt.hash('MLA@2026', 10);
        users.push({
            id: 'user_default',
            email: 'admin@mylegalacademy.com',
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }
}

export class SimpleAuthService {
    private static SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

    static async ensureDefaultUser(): Promise<void> {
        await initDefaultUser();
    }

    static async authenticateWithPassword(password: string): Promise<SimpleUser | null> {
        await this.ensureDefaultUser();
        
        const user = users[0]; // Single user system
        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
            id: user.id,
            email: user.email,
            password: user.password,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
    }

    static async createSession(userId: string): Promise<string> {
        // Generate crypto-random token
        const tokenBuffer = new Uint8Array(32);
        crypto.getRandomValues(tokenBuffer);
        const token = Array.from(tokenBuffer, byte => byte.toString(16).padStart(2, '0')).join('');
        const expiresAt = new Date(Date.now() + this.SESSION_DURATION);

        // Clean up existing sessions for this user
        sessions = sessions.filter(s => s.userId !== userId);

        // Create new session
        const session: SimpleSession = {
            id: 'session_' + Date.now(),
            userId,
            token,
            expiresAt,
            createdAt: new Date()
        };

        sessions.push(session);
        return token;
    }

    static async validateSession(token: string): Promise<SimpleUser | null> {
        const session = sessions.find(s => s.token === token);
        
        if (!session || session.expiresAt < new Date()) {
            if (session) {
                // Remove expired session
                sessions = sessions.filter(s => s.id !== session.id);
            }
            return null;
        }

        const user = users.find(u => u.id === session.userId);
        if (!user) return null;

        return {
            id: user.id,
            email: user.email,
            password: user.password,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
    }

    static async deleteSession(token: string): Promise<void> {
        sessions = sessions.filter(s => s.token !== token);
    }

    static async updatePassword(userId: string, newPassword: string): Promise<boolean> {
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) return false;

        try {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            users[userIndex].password = hashedPassword;
            users[userIndex].updatedAt = new Date();
            return true;
        } catch (error) {
            console.error('Failed to update password:', error);
            return false;
        }
    }

    static async cleanupExpiredSessions(): Promise<void> {
        const now = new Date();
        sessions = sessions.filter(s => s.expiresAt >= now);
    }
}