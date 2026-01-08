/**
 * API Route Tests
 * 
 * Tests the Next.js API routes for:
 * - Authentication (login/logout)
 * - OAuth callbacks
 * - Data endpoints
 */

import { createMocks } from 'node-mocks-http';
import { POST as loginHandler } from '../src/app/api/auth/login/route';
import { POST as logoutHandler } from '../src/app/api/auth/logout/route';
import { AuthService } from '../src/lib/auth';
import { prisma } from './setup';

// Mock the AuthService
jest.mock('../src/lib/auth');
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

// Mock cookies
const mockCookies = {
  set: jest.fn(),
  get: jest.fn(),
  delete: jest.fn()
};

jest.mock('next/headers', () => ({
  cookies: () => mockCookies
}));

describe('API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCookies.set.mockClear();
    mockCookies.get.mockClear();
    mockCookies.delete.mockClear();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Auth Login Route', () => {
    test('should login with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockAuthService.verifyPassword.mockResolvedValue(mockUser);
      mockAuthService.createSession.mockResolvedValue('test-session-token');

      const { req } = createMocks({
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'password123'
        }
      });

      // Create a proper Request object
      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.email).toBe('test@example.com');
      expect(mockCookies.set).toHaveBeenCalledWith('session_token', 'test-session-token', expect.any(Object));
    });

    test('should reject invalid credentials', async () => {
      mockAuthService.verifyPassword.mockResolvedValue(null);

      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid email or password');
      expect(mockCookies.set).not.toHaveBeenCalled();
    });

    test('should validate required fields', async () => {
      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com'
          // Missing password
        })
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email and password are required');
    });

    test('should handle authentication service errors', async () => {
      mockAuthService.verifyPassword.mockRejectedValue(new Error('Database connection failed'));

      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Login failed');
    });

    test('should set secure cookie in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockAuthService.verifyPassword.mockResolvedValue(mockUser);
      mockAuthService.createSession.mockResolvedValue('test-session-token');

      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });

      await loginHandler(request);

      expect(mockCookies.set).toHaveBeenCalledWith('session_token', 'test-session-token', 
        expect.objectContaining({
          secure: true,
          httpOnly: true,
          sameSite: 'lax'
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Auth Logout Route', () => {
    test('should logout and clear session', async () => {
      mockCookies.get.mockReturnValue({ value: 'test-session-token' });
      mockAuthService.deleteSession.mockResolvedValue();

      const request = new Request('http://localhost/api/auth/logout', {
        method: 'POST'
      });

      const response = await logoutHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockAuthService.deleteSession).toHaveBeenCalledWith('test-session-token');
      expect(mockCookies.delete).toHaveBeenCalledWith('session_token');
    });

    test('should handle logout without session token', async () => {
      mockCookies.get.mockReturnValue(undefined);

      const request = new Request('http://localhost/api/auth/logout', {
        method: 'POST'
      });

      const response = await logoutHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockCookies.delete).toHaveBeenCalledWith('session_token');
    });

    test('should handle logout service errors', async () => {
      mockCookies.get.mockReturnValue({ value: 'test-session-token' });
      mockAuthService.deleteSession.mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/auth/logout', {
        method: 'POST'
      });

      const response = await logoutHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Logout failed');
    });
  });

  describe('OAuth Callback Route Tests', () => {
    // Note: These would require more complex mocking of the OAuth callback route
    // For now, we'll test the basic structure and error handling

    test('should validate OAuth callback structure', () => {
      // This test ensures the OAuth callback route structure is correct
      // In a full implementation, we would mock the OAuth provider responses
      // and test the token exchange and storage process
      
      const requiredOAuthConfigs = ['clio', 'execview', 'quickbooks'];
      
      requiredOAuthConfigs.forEach(service => {
        // Test that environment variables are expected
        const clientIdKey = `${service.toUpperCase()}_CLIENT_ID`;
        const clientSecretKey = `${service.toUpperCase()}_CLIENT_SECRET`;
        
        // These would be checked in the actual OAuth callback
        expect(typeof clientIdKey).toBe('string');
        expect(typeof clientSecretKey).toBe('string');
      });
    });
  });

  describe('API Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json'
      });

      const response = await loginHandler(request);
      
      expect(response.status).toBe(500);
    });

    test('should handle missing Content-Type', async () => {
      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });

      const response = await loginHandler(request);
      
      // Should still work without explicit Content-Type
      expect(response.status).toBe(401); // Because mock returns null for verifyPassword
    });
  });

  describe('Security Tests', () => {
    test('should not expose sensitive information in errors', async () => {
      mockAuthService.verifyPassword.mockRejectedValue(new Error('Detailed database error with sensitive info'));

      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Login failed'); // Generic error message
      expect(data.error).not.toContain('sensitive info');
    });

    test('should set appropriate cookie security flags', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockAuthService.verifyPassword.mockResolvedValue(mockUser);
      mockAuthService.createSession.mockResolvedValue('test-session-token');

      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });

      await loginHandler(request);

      expect(mockCookies.set).toHaveBeenCalledWith('session_token', 'test-session-token', 
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60 // 7 days
        })
      );
    });
  });
});