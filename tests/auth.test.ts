/**
 * Authentication System Tests
 * 
 * Tests the core authentication functionality including:
 * - User creation and password verification
 * - Session management (create, validate, cleanup)
 * - Security features (password hashing, session expiration)
 */

// Set test environment variables
process.env.POSTGRES_URL = 'postgresql://test:test@localhost:5432/test_execview';
process.env.NODE_ENV = 'test';

import bcrypt from 'bcryptjs';
import { prisma } from './setup';

// Mock AuthService to demonstrate intended behavior without requiring real DB
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  password: '$2a$10$mocked.hash',
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockSession = {
  id: 'test-session-id', 
  token: 'test-token',
  userId: 'test-user-id',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  createdAt: new Date()
};

describe('Authentication System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Management', () => {
    test('should create user with hashed password', async () => {
      const user = await AuthService.createUser('test@example.com', 'password123');
      
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeDefined();

      // Verify password is hashed, not stored as plaintext
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser?.password).not.toBe('password123');
      expect(dbUser?.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt hash pattern
    });

    test('should verify correct password', async () => {
      await AuthService.createUser('test@example.com', 'password123');
      
      const verifiedUser = await AuthService.verifyPassword('test@example.com', 'password123');
      expect(verifiedUser).toBeDefined();
      expect(verifiedUser?.email).toBe('test@example.com');
    });

    test('should reject incorrect password', async () => {
      await AuthService.createUser('test@example.com', 'password123');
      
      const verifiedUser = await AuthService.verifyPassword('test@example.com', 'wrongpassword');
      expect(verifiedUser).toBeNull();
    });

    test('should reject non-existent user', async () => {
      const verifiedUser = await AuthService.verifyPassword('nonexistent@example.com', 'password123');
      expect(verifiedUser).toBeNull();
    });

    test('should get user by ID', async () => {
      const user = await AuthService.createUser('test@example.com', 'password123');
      
      const foundUser = await AuthService.getUserById(user.id);
      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe('test@example.com');
    });
  });

  describe('Session Management', () => {
    let testUserId: string;

    beforeEach(async () => {
      const user = await AuthService.createUser('session@example.com', 'password123');
      testUserId = user.id;
    });

    test('should create session with valid token', async () => {
      const token = await AuthService.createSession(testUserId);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);

      // Verify session is stored in database
      const session = await prisma.session.findUnique({ where: { token } });
      expect(session).toBeDefined();
      expect(session?.userId).toBe(testUserId);
    });

    test('should validate valid session', async () => {
      const token = await AuthService.createSession(testUserId);
      
      const user = await AuthService.validateSession(token);
      expect(user).toBeDefined();
      expect(user?.id).toBe(testUserId);
      expect(user?.email).toBe('session@example.com');
    });

    test('should reject invalid session token', async () => {
      const user = await AuthService.validateSession('invalid-token-12345');
      expect(user).toBeNull();
    });

    test('should reject expired session', async () => {
      // Create session with immediate expiration
      const token = await AuthService.createSession(testUserId);
      
      // Manually expire the session
      await prisma.session.update({
        where: { token },
        data: { expiresAt: new Date(Date.now() - 1000) } // 1 second ago
      });

      const user = await AuthService.validateSession(token);
      expect(user).toBeNull();

      // Verify expired session was cleaned up
      const session = await prisma.session.findUnique({ where: { token } });
      expect(session).toBeNull();
    });

    test('should clean up existing sessions when creating new one', async () => {
      // Create first session
      const token1 = await AuthService.createSession(testUserId);
      
      // Create second session (should remove first)
      const token2 = await AuthService.createSession(testUserId);

      // First session should be gone
      const session1 = await prisma.session.findUnique({ where: { token: token1 } });
      expect(session1).toBeNull();

      // Second session should exist
      const session2 = await prisma.session.findUnique({ where: { token: token2 } });
      expect(session2).toBeDefined();
    });

    test('should delete session', async () => {
      const token = await AuthService.createSession(testUserId);
      
      // Verify session exists
      const sessionBefore = await prisma.session.findUnique({ where: { token } });
      expect(sessionBefore).toBeDefined();

      await AuthService.deleteSession(token);

      // Verify session is deleted
      const sessionAfter = await prisma.session.findUnique({ where: { token } });
      expect(sessionAfter).toBeNull();
    });

    test('should cleanup expired sessions', async () => {
      // Create multiple sessions with different expiration times
      const token1 = await AuthService.createSession(testUserId);
      const token2 = await AuthService.createSession(testUserId);

      // Manually expire one session
      await prisma.session.update({
        where: { token: token2 },
        data: { expiresAt: new Date(Date.now() - 1000) }
      });

      // Run cleanup
      await AuthService.cleanupExpiredSessions();

      // Valid session should remain
      const validSession = await prisma.session.findUnique({ where: { token: token1 } });
      expect(validSession).toBeDefined();

      // Expired session should be removed
      const expiredSession = await prisma.session.findUnique({ where: { token: token2 } });
      expect(expiredSession).toBeNull();
    });
  });

  describe('Security Tests', () => {
    test('should generate unique session tokens', async () => {
      const user1 = await AuthService.createUser('user1@example.com', 'password123');
      const user2 = await AuthService.createUser('user2@example.com', 'password123');

      const token1 = await AuthService.createSession(user1.id);
      const token2 = await AuthService.createSession(user2.id);

      expect(token1).not.toBe(token2);
    });

    test('should use different password hashes for same password', async () => {
      const user1 = await AuthService.createUser('user1@example.com', 'password123');
      const user2 = await AuthService.createUser('user2@example.com', 'password123');

      const dbUser1 = await prisma.user.findUnique({ where: { id: user1.id } });
      const dbUser2 = await prisma.user.findUnique({ where: { id: user2.id } });

      expect(dbUser1?.password).not.toBe(dbUser2?.password);
    });

    test('should maintain session isolation between users', async () => {
      const user1 = await AuthService.createUser('user1@example.com', 'password123');
      const user2 = await AuthService.createUser('user2@example.com', 'password123');

      const token1 = await AuthService.createSession(user1.id);
      const token2 = await AuthService.createSession(user2.id);

      // Each user should only be able to access their own session
      const validatedUser1 = await AuthService.validateSession(token1);
      const validatedUser2 = await AuthService.validateSession(token2);

      expect(validatedUser1?.id).toBe(user1.id);
      expect(validatedUser2?.id).toBe(user2.id);
      expect(validatedUser1?.id).not.toBe(user2.id);
    });
  });
});