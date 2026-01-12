/**
 * Single Law Firm Setup
 * Pre-configure everything needed for one law firm to start using ExecView immediately
 */

import { PrismaClient } from '@prisma/client';
import { AuthService } from './auth';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export interface SingleFirmSetup {
  userId: string;
  email: string;
  firmName: string;
  apiConfigs: {
    clio: boolean;
    gohighlevel: boolean;
    quickbooks: boolean;
  };
  dashboardReady: boolean;
}

export class SingleFirmSetupService {
  /**
   * Complete setup for a single law firm
   */
  static async setupSingleFirm(config: {
    email: string;
    password: string;
    firmName: string;
    practiceAreas: string[];
    timezone?: string;
    annualRevenueGoal?: number;
    annualLeadsGoal?: number;
  }): Promise<SingleFirmSetup> {
    
    // 1. Create user and profile
    const user = await AuthService.createUser(config.email, config.password);
    
    await prisma.profile.create({
      data: {
        userId: user.id,
        name: `${config.firmName} Admin`,
        firmName: config.firmName,
        email: config.email,
        practiceAreas: JSON.stringify(config.practiceAreas),
        timezone: config.timezone || 'America/New_York',
        businessHours: JSON.stringify({
          monday: { start: '09:00', end: '17:00', open: true },
          tuesday: { start: '09:00', end: '17:00', open: true },
          wednesday: { start: '09:00', end: '17:00', open: true },
          thursday: { start: '09:00', end: '17:00', open: true },
          friday: { start: '09:00', end: '17:00', open: true },
          saturday: { start: '10:00', end: '14:00', open: false },
          sunday: { start: '10:00', end: '14:00', open: false }
        })
      }
    });

    // 2. Create API config placeholders (will be filled when OAuth is completed)
    const apiConfigs = { clio: false, gohighlevel: false, quickbooks: false };
    
    for (const service of ['clio', 'execview', 'quickbooks']) {
      await prisma.apiConfig.create({
        data: {
          service,
          userId: user.id,
          isActive: false
        }
      });
    }

    // 3. Set up system settings with goals
    await prisma.systemSettings.create({
      data: {
        userId: user.id,
        settingKey: 'annual_goals',
        settingValue: JSON.stringify({
          revenueGoal: config.annualRevenueGoal || 500000,
          leadsGoal: config.annualLeadsGoal || 1000,
          setupDate: new Date().toISOString()
        })
      }
    });

    // 4. Create initial dashboard cache structure
    await this.setupInitialDashboard(user.id);

    // 5. Set up automated sync schedule
    await prisma.systemSettings.create({
      data: {
        userId: user.id,
        settingKey: 'sync_schedule',
        settingValue: JSON.stringify({
          enabled: true,
          frequency: 'daily',
          time: '06:00', // 6 AM daily sync
          timezone: config.timezone || 'America/New_York'
        })
      }
    });

    return {
      userId: user.id,
      email: user.email,
      firmName: config.firmName,
      apiConfigs,
      dashboardReady: true
    };
  }

  /**
   * Create initial dashboard cache with empty structure
   */
  private static async setupInitialDashboard(userId: string): Promise<void> {
    const initialCache = {
      lastUpdated: new Date().toISOString(),
      firmMetrics: {
        totalYtdRevenue: 0,
        weeklyRevenue: 0,
        averageCaseValue: 0,
        weeklyLeads: 0
      },
      caseManagement: {
        openCases: 0,
        upcomingCourtDates: 0,
        totalOutstandingBalance: 0
      },
      leadTracking: {
        weeklyLeads: 0,
        conversionRate: 0,
        leadSources: {}
      },
      bookkeeping: {
        weeklyCollections: 0,
        pendingInvoices: 0
      }
    };

    await prisma.dashboardCache.create({
      data: {
        userId,
        cacheKey: 'weekly_dashboard',
        cacheData: JSON.stringify(initialCache)
      }
    });
  }

  /**
   * Check if single firm setup is complete
   */
  static async isSetupComplete(userId: string): Promise<boolean> {
    const profile = await prisma.profile.findUnique({
      where: { userId }
    });

    const apiConfigs = await prisma.apiConfig.findMany({
      where: { userId, isActive: true }
    });

    const dashboardCache = await prisma.dashboardCache.findFirst({
      where: { userId }
    });

    return !!(profile && apiConfigs.length > 0 && dashboardCache);
  }

  /**
   * Get setup status and next steps
   */
  static async getSetupStatus(userId: string): Promise<{
    isComplete: boolean;
    completedSteps: string[];
    nextSteps: string[];
    stats: {
      profileComplete: boolean;
      apiConnectionsCount: number;
      dashboardReady: boolean;
    };
  }> {
    const profile = await prisma.profile.findUnique({
      where: { userId }
    });

    const apiConfigs = await prisma.apiConfig.findMany({
      where: { userId, isActive: true }
    });

    const dashboardCache = await prisma.dashboardCache.findFirst({
      where: { userId }
    });

    const completedSteps: string[] = [];
    const nextSteps: string[] = [];

    if (profile) {
      completedSteps.push('Profile created');
    } else {
      nextSteps.push('Create firm profile');
    }

    if (apiConfigs.length > 0) {
      completedSteps.push(`${apiConfigs.length} API connection(s) active`);
    } else {
      nextSteps.push('Connect to Clio, GoHighLevel, or QuickBooks');
    }

    if (dashboardCache) {
      completedSteps.push('Dashboard initialized');
    } else {
      nextSteps.push('Initialize dashboard');
    }

    const setupComplete = profile && apiConfigs.length > 0 && dashboardCache;

    return {
      isComplete: !!setupComplete,
      completedSteps,
      nextSteps: setupComplete ? [] : nextSteps,
      stats: {
        profileComplete: !!profile,
        apiConnectionsCount: apiConfigs.length,
        dashboardReady: !!dashboardCache
      }
    };
  }
}