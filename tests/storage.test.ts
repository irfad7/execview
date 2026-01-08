/**
 * Database Storage Tests
 * 
 * Tests all database operations including:
 * - API configuration management
 * - Dashboard cache operations
 * - Profile management
 * - Field mappings
 * - System settings
 * - Logging functionality
 * - Sync status tracking
 */

import { 
  getApiConfigs,
  disconnectService,
  setCachedData,
  getLiveDashboardData,
  saveFieldMapping,
  getFieldMappings,
  getProfile,
  updateProfile,
  addLog,
  getLogs,
  updateSystemSetting,
  getSystemSetting,
  updateSyncStatus,
  getSyncStatus
} from '../src/lib/dbActions';
import { AuthService } from '../src/lib/auth';
import { prisma } from './setup';

// Mock the cookies() function that's used in getUser()
jest.mock('next/headers', () => ({
  cookies: () => ({
    get: jest.fn(() => ({ value: 'test-session-token' }))
  })
}));

// Mock the AuthService.validateSession to return a test user
jest.mock('../src/lib/auth');
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

describe('Database Storage Operations', () => {
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeAll(() => {
    // Mock the AuthService.validateSession to return our test user
    mockAuthService.validateSession.mockResolvedValue(mockUser);
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.systemSetting.deleteMany();
    await prisma.log.deleteMany();
    await prisma.syncStatus.deleteMany();
    await prisma.fieldMapping.deleteMany();
    await prisma.dashboardCache.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.apiConfig.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    // Create the test user that our mocked auth will return
    await prisma.user.create({
      data: {
        id: mockUser.id,
        email: mockUser.email,
        password: 'hashedpassword'
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('API Configuration Management', () => {
    test('should create default API configs for all services', async () => {
      const configs = await getApiConfigs();
      
      expect(configs).toHaveLength(3);
      expect(configs.map(c => c.service)).toEqual(['clio', 'execview', 'quickbooks']);
      
      configs.forEach(config => {
        expect(config.service).toBeDefined();
        expect(config.accessToken).toBeNull();
        expect(config.updatedAt).toBeDefined();
      });
    });

    test('should disconnect service by clearing tokens', async () => {
      // First create a config with tokens
      await prisma.apiConfig.create({
        data: {
          service: 'clio',
          userId: mockUser.id,
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          expiresAt: 3600
        }
      });

      await disconnectService('clio');

      const config = await prisma.apiConfig.findUnique({
        where: { service_userId: { service: 'clio', userId: mockUser.id } }
      });

      expect(config?.accessToken).toBeNull();
      expect(config?.refreshToken).toBeNull();
      expect(config?.expiresAt).toBeNull();
    });
  });

  describe('Dashboard Cache Operations', () => {
    test('should cache and retrieve dashboard data', async () => {
      const testData = {
        activeCases: 5,
        googleReviewsWeekly: 3,
        newCasesSignedWeekly: 2,
        ghl: { leadsWeekly: 10 },
        qb: { revenueYTD: 50000 }
      };

      await setCachedData(testData);
      const cachedData = await getLiveDashboardData();

      expect(cachedData).toEqual(testData);
    });

    test('should return null when no cached data exists', async () => {
      const cachedData = await getLiveDashboardData();
      expect(cachedData).toBeNull();
    });

    test('should handle invalid JSON in cache gracefully', async () => {
      await prisma.dashboardCache.create({
        data: {
          userId: mockUser.id,
          data: 'invalid-json-data'
        }
      });

      const cachedData = await getLiveDashboardData();
      expect(cachedData).toBeNull();
    });

    test('should update existing cache data', async () => {
      const initialData = { activeCases: 5 };
      const updatedData = { activeCases: 8, newField: 'test' };

      await setCachedData(initialData);
      await setCachedData(updatedData);

      const cachedData = await getLiveDashboardData();
      expect(cachedData).toEqual(updatedData);

      // Verify only one cache record exists
      const cacheCount = await prisma.dashboardCache.count({
        where: { userId: mockUser.id }
      });
      expect(cacheCount).toBe(1);
    });
  });

  describe('Field Mapping Operations', () => {
    test('should save and retrieve field mappings', async () => {
      await saveFieldMapping('clio', 'discoveryReceived', 'custom_field_discovery');
      
      const mappings = await getFieldMappings('clio');
      
      expect(mappings).toHaveLength(1);
      expect(mappings[0].service).toBe('clio');
      expect(mappings[0].dashboardField).toBe('discoveryReceived');
      expect(mappings[0].sourceField).toBe('custom_field_discovery');
      expect(mappings[0].userId).toBe(mockUser.id);
    });

    test('should update existing field mapping', async () => {
      await saveFieldMapping('clio', 'discoveryReceived', 'old_field_name');
      await saveFieldMapping('clio', 'discoveryReceived', 'new_field_name');

      const mappings = await getFieldMappings('clio');
      
      expect(mappings).toHaveLength(1);
      expect(mappings[0].sourceField).toBe('new_field_name');
    });

    test('should handle multiple mappings for different services', async () => {
      await saveFieldMapping('clio', 'discoveryReceived', 'clio_discovery_field');
      await saveFieldMapping('ghl', 'leadSource', 'ghl_source_field');

      const clioMappings = await getFieldMappings('clio');
      const ghlMappings = await getFieldMappings('ghl');

      expect(clioMappings).toHaveLength(1);
      expect(ghlMappings).toHaveLength(1);
      expect(clioMappings[0].service).toBe('clio');
      expect(ghlMappings[0].service).toBe('ghl');
    });
  });

  describe('Profile Management', () => {
    test('should create default profile for new user', async () => {
      const profile = await getProfile();

      expect(profile).toBeDefined();
      expect(profile?.id).toBe(mockUser.id);
      expect(profile?.email).toBe(mockUser.email);
      expect(profile?.name).toBe('New User');
      expect(profile?.firmName).toBe('My Firm');
    });

    test('should return existing profile', async () => {
      // Create a profile first
      await prisma.profile.create({
        data: {
          id: mockUser.id,
          name: 'John Doe',
          firmName: 'Doe Law Firm',
          email: mockUser.email
        }
      });

      const profile = await getProfile();

      expect(profile?.name).toBe('John Doe');
      expect(profile?.firmName).toBe('Doe Law Firm');
    });

    test('should update profile information', async () => {
      // Create initial profile
      await getProfile();

      const updateData = {
        name: 'Jane Smith',
        firmName: 'Smith & Associates',
        phone: '+1-555-123-4567'
      };

      await updateProfile(updateData);

      const updatedProfile = await getProfile();
      expect(updatedProfile?.name).toBe('Jane Smith');
      expect(updatedProfile?.firmName).toBe('Smith & Associates');
      expect(updatedProfile?.phone).toBe('+1-555-123-4567');
    });
  });

  describe('Logging System', () => {
    test('should add and retrieve logs', async () => {
      await addLog('clio', 'info', 'Test log message', 'Additional details');

      const logs = await getLogs(10);

      expect(logs).toHaveLength(1);
      expect(logs[0].service).toBe('clio');
      expect(logs[0].level).toBe('info');
      expect(logs[0].message).toBe('Test log message');
      expect(logs[0].details).toBe('Additional details');
      expect(logs[0].userId).toBe(mockUser.id);
    });

    test('should retrieve logs in descending order by creation time', async () => {
      await addLog('service1', 'info', 'First log');
      await addLog('service2', 'error', 'Second log');
      await addLog('service3', 'debug', 'Third log');

      const logs = await getLogs(10);

      expect(logs).toHaveLength(3);
      expect(logs[0].message).toBe('Third log');
      expect(logs[1].message).toBe('Second log');
      expect(logs[2].message).toBe('First log');
    });

    test('should respect log limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await addLog('test', 'info', `Log message ${i}`);
      }

      const logs = await getLogs(3);

      expect(logs).toHaveLength(3);
    });

    test('should handle logs without details', async () => {
      await addLog('test', 'warning', 'Log without details');

      const logs = await getLogs(1);

      expect(logs[0].details).toBeNull();
    });
  });

  describe('System Settings', () => {
    test('should save and retrieve system settings', async () => {
      const settingValue = { theme: 'dark', notifications: true };
      
      await updateSystemSetting('user_preferences', settingValue);
      const retrieved = await getSystemSetting('user_preferences');

      expect(retrieved).toEqual(settingValue);
    });

    test('should return null for non-existent setting', async () => {
      const setting = await getSystemSetting('non_existent_key');
      expect(setting).toBeNull();
    });

    test('should update existing system setting', async () => {
      const initialValue = { setting1: 'value1' };
      const updatedValue = { setting1: 'updated_value' };

      await updateSystemSetting('test_setting', initialValue);
      await updateSystemSetting('test_setting', updatedValue);

      const retrieved = await getSystemSetting('test_setting');
      expect(retrieved).toEqual(updatedValue);

      // Verify only one setting record exists
      const settingCount = await prisma.systemSetting.count({
        where: { key: 'test_setting', userId: mockUser.id }
      });
      expect(settingCount).toBe(1);
    });

    test('should handle complex data structures', async () => {
      const complexData = {
        arrayData: [1, 2, 3],
        nestedObject: {
          prop1: 'value1',
          prop2: {
            deepProp: 'deepValue'
          }
        },
        booleanValue: true,
        numberValue: 42.5
      };

      await updateSystemSetting('complex_setting', complexData);
      const retrieved = await getSystemSetting('complex_setting');

      expect(retrieved).toEqual(complexData);
    });
  });

  describe('Sync Status Tracking', () => {
    test('should update and retrieve sync status', async () => {
      await updateSyncStatus('success', null);

      const status = await getSyncStatus();

      expect(status?.status).toBe('success');
      expect(status?.errorMessage).toBeNull();
      expect(status?.lastUpdated).toBeDefined();
      expect(status?.userId).toBe(mockUser.id);
    });

    test('should handle sync status with error message', async () => {
      const errorMessage = 'API connection failed';
      
      await updateSyncStatus('error', errorMessage);

      const status = await getSyncStatus();

      expect(status?.status).toBe('error');
      expect(status?.errorMessage).toBe(errorMessage);
    });

    test('should return null when no sync status exists', async () => {
      const status = await getSyncStatus();
      expect(status).toBeNull();
    });

    test('should update existing sync status', async () => {
      await updateSyncStatus('pending', null);
      await updateSyncStatus('completed', null);

      const status = await getSyncStatus();

      expect(status?.status).toBe('completed');

      // Verify only one sync status record exists
      const statusCount = await prisma.syncStatus.count({
        where: { userId: mockUser.id }
      });
      expect(statusCount).toBe(1);
    });
  });

  describe('Multi-user Isolation', () => {
    const otherUser = {
      id: 'other-user-456',
      email: 'other@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    beforeEach(async () => {
      // Create second user
      await prisma.user.create({
        data: {
          id: otherUser.id,
          email: otherUser.email,
          password: 'hashedpassword'
        }
      });

      // Add some data for the other user
      await prisma.apiConfig.create({
        data: {
          service: 'clio',
          userId: otherUser.id,
          accessToken: 'other-user-token'
        }
      });

      await prisma.profile.create({
        data: {
          id: otherUser.id,
          name: 'Other User',
          firmName: 'Other Firm',
          email: otherUser.email
        }
      });
    });

    test('should isolate API configs between users', async () => {
      const configs = await getApiConfigs();
      
      // Should only see configs for the mocked user, not the other user
      expect(configs).toHaveLength(3); // Default configs for current user
      expect(configs.some(c => c.accessToken === 'other-user-token')).toBe(false);
    });

    test('should isolate profiles between users', async () => {
      const profile = await getProfile();
      
      expect(profile?.name).not.toBe('Other User');
      expect(profile?.firmName).not.toBe('Other Firm');
    });
  });
});