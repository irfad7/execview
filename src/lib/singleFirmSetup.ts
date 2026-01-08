/**
 * Single Law Firm Setup
 * Pre-configure everything needed for one law firm to start using ExecView immediately
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import { AuthService } from './auth';
import { DEFAULT_FIELD_MAPPINGS } from '../config/defaultFieldMappings';
import bcrypt from 'bcryptjs';

export interface SingleFirmSetup {
  userId: string;
  email: string;
  firmName: string;
  apiConfigs: {
    clio: boolean;
    gohighlevel: boolean;
    quickbooks: boolean;
  };
  fieldMappingsConfigured: boolean;
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
    clioClientId?: string;
    clioClientSecret?: string;
    ghlClientId?: string;
    ghlClientSecret?: string;
    qbClientId?: string;
    qbClientSecret?: string;
    annualRevenueGoal?: number;
    annualLeadsGoal?: number;
  }): Promise<SingleFirmSetup> {
    
    // 1. Create the main firm user
    const user = await AuthService.createUser(config.email, config.password);
    
    // 2. Create firm profile
    await prisma.profile.create({
      data: {
        userId: user.id,
        firmName: config.firmName,
        practiceAreas: JSON.stringify([
          'Criminal Defense',
          'DUI/DWI', 
          'Traffic',
          'Family Law',
          'Personal Injury'
        ]),
        timezone: 'America/New_York', // Default timezone
        businessHours: JSON.stringify({
          monday: { start: '09:00', end: '17:00' },
          tuesday: { start: '09:00', end: '17:00' },
          wednesday: { start: '09:00', end: '17:00' },
          thursday: { start: '09:00', end: '17:00' },
          friday: { start: '09:00', end: '17:00' },
          saturday: { start: '09:00', end: '13:00' },
          sunday: { start: 'closed', end: 'closed' }
        })
      }
    });

    // 3. Set up API configurations
    const apiConfigs = {
      clio: false,
      gohighlevel: false,
      quickbooks: false
    };

    if (config.clioClientId && config.clioClientSecret) {
      await prisma.apiConfig.create({
        data: {
          userId: user.id,
          service: 'clio',
          clientId: config.clioClientId,
          clientSecret: config.clioClientSecret,
          isActive: true
        }
      });
      apiConfigs.clio = true;
    }

    if (config.ghlClientId && config.ghlClientSecret) {
      await prisma.apiConfig.create({
        data: {
          userId: user.id,
          service: 'gohighlevel',
          clientId: config.ghlClientId,
          clientSecret: config.ghlClientSecret,
          isActive: true
        }
      });
      apiConfigs.gohighlevel = true;
    }

    if (config.qbClientId && config.qbClientSecret) {
      await prisma.apiConfig.create({
        data: {
          userId: user.id,
          service: 'quickbooks',
          clientId: config.qbClientId,
          clientSecret: config.qbClientSecret,
          isActive: true
        }
      });
      apiConfigs.quickbooks = true;
    }

    // 4. Configure intelligent field mappings
    await this.setupFieldMappings(user.id);

    // 5. Set up system settings with goals
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

    // 6. Create initial dashboard cache structure
    await this.setupInitialDashboard(user.id);

    // 7. Set up automated sync schedule
    await prisma.systemSettings.create({
      data: {
        userId: user.id,
        settingKey: 'sync_schedule',
        settingValue: JSON.stringify({
          enabled: true,
          frequency: 'daily',
          time: '06:00', // 6 AM daily sync
          timezone: 'America/New_York'
        })
      }
    });

    return {
      userId: user.id,
      email: user.email,
      firmName: config.firmName,
      apiConfigs,
      fieldMappingsConfigured: true,
      dashboardReady: true
    };
  }

  /**
   * Set up intelligent field mappings from defaults
   */
  private static async setupFieldMappings(userId: string): Promise<void> {
    for (const mapping of DEFAULT_FIELD_MAPPINGS) {
      await prisma.fieldMapping.create({
        data: {
          userId,
          service: mapping.system,
          category: mapping.category,
          mappings: JSON.stringify(mapping.mappings)
        }
      });
    }
  }

  /**
   * Create initial dashboard cache structure
   */
  private static async setupInitialDashboard(userId: string): Promise<void> {
    const initialDashboardData = {
      caseManagement: {
        weeklyOpenCases: [],
        upcomingCourtDates: [],
        totalOutstandingBalance: 0,
        percentageNoDiscovery: 0,
        percentageNoPleaOffer: 0,
        casesByChargeType: {}
      },
      bookkeeping: {
        weeklyClosedCases: []
      },
      firmMetrics: {
        totalYtdRevenue: 0,
        weeklyRevenue: 0,
        averageCaseValueYtd: 0,
        weeklyLeads: 0,
        ytdLeads: 0,
        conversionRate: {
          consultsScheduledPerLead: 0,
          retainersSignedPerConsult: 0
        },
        marketingRoi: {
          roiPercentage: 0,
          clientAcquisitionCost: 0
        },
        leadSourceBreakdown: {},
        weeklyGoogleReviews: 0,
        weeklyNewCasesSigned: 0,
        activeCases: 0
      },
      leadsTracking: {
        dailyLeads: []
      },
      lastUpdated: new Date().toISOString()
    };

    await prisma.dashboardCache.create({
      data: {
        userId,
        cacheKey: 'weekly_metrics',
        cacheData: JSON.stringify(initialDashboardData)
      }
    });
  }

  /**
   * Validate that a user is properly set up
   */
  static async validateSingleFirmSetup(userId: string): Promise<{
    isValid: boolean;
    missingComponents: string[];
    recommendations: string[];
  }> {
    const missingComponents: string[] = [];
    const recommendations: string[] = [];

    // Check user profile
    const profile = await prisma.profile.findUnique({
      where: { userId }
    });
    if (!profile) {
      missingComponents.push('Profile');
      recommendations.push('Complete firm profile setup');
    }

    // Check API configurations
    const apiConfigs = await prisma.apiConfig.findMany({
      where: { userId, isActive: true }
    });
    if (apiConfigs.length === 0) {
      missingComponents.push('API Integrations');
      recommendations.push('Connect at least one API (Clio, GHL, or QB)');
    }

    // Check field mappings
    const fieldMappings = await prisma.fieldMapping.findMany({
      where: { userId }
    });
    if (fieldMappings.length === 0) {
      missingComponents.push('Field Mappings');
      recommendations.push('Configure field mappings for data extraction');
    }

    // Check dashboard cache
    const dashboardCache = await prisma.dashboardCache.findFirst({
      where: { userId }
    });
    if (!dashboardCache) {
      missingComponents.push('Dashboard Cache');
      recommendations.push('Initialize dashboard data structure');
    }

    // Check annual goals
    const goals = await prisma.systemSettings.findFirst({
      where: { 
        userId,
        settingKey: 'annual_goals'
      }
    });
    if (!goals) {
      missingComponents.push('Annual Goals');
      recommendations.push('Set annual revenue and leads goals');
    }

    return {
      isValid: missingComponents.length === 0,
      missingComponents,
      recommendations
    };
  }

  /**
   * Generate setup completion report
   */
  static async generateSetupReport(userId: string): Promise<{
    setupComplete: boolean;
    firmName: string;
    connectedSystems: string[];
    fieldMappingsCount: number;
    dashboardReady: boolean;
    annualGoals: {
      revenue: number;
      leads: number;
    };
    nextSteps: string[];
  }> {
    const profile = await prisma.profile.findUnique({
      where: { userId }
    });

    const apiConfigs = await prisma.apiConfig.findMany({
      where: { userId, isActive: true }
    });

    const fieldMappings = await prisma.fieldMapping.findMany({
      where: { userId }
    });

    const dashboardCache = await prisma.dashboardCache.findFirst({
      where: { userId }
    });

    const goalsSettings = await prisma.systemSettings.findFirst({
      where: { 
        userId,
        settingKey: 'annual_goals'
      }
    });

    const goals = goalsSettings ? JSON.parse(goalsSettings.settingValue) : { revenueGoal: 0, leadsGoal: 0 };
    
    const connectedSystems = apiConfigs.map(config => config.service);
    const setupComplete = profile && apiConfigs.length > 0 && fieldMappings.length > 0 && dashboardCache;

    const nextSteps = [];
    if (!setupComplete) {
      if (!profile) nextSteps.push('Complete firm profile');
      if (apiConfigs.length === 0) nextSteps.push('Connect API integrations');
      if (fieldMappings.length === 0) nextSteps.push('Configure field mappings');
      if (!dashboardCache) nextSteps.push('Initialize dashboard');
    } else {
      nextSteps.push('Test OAuth connections');
      nextSteps.push('Run first data sync');
      nextSteps.push('Verify metric calculations');
      nextSteps.push('Schedule automated syncing');
    }

    return {
      setupComplete: Boolean(setupComplete),
      firmName: profile?.firmName || 'Unknown',
      connectedSystems,
      fieldMappingsCount: fieldMappings.length,
      dashboardReady: Boolean(dashboardCache),
      annualGoals: {
        revenue: goals.revenueGoal || 0,
        leads: goals.leadsGoal || 0
      },
      nextSteps
    };
  }

  /**
   * Quick setup with sensible defaults for immediate demo
   */
  static async quickDemoSetup(): Promise<SingleFirmSetup> {
    const demoConfig = {
      email: 'demo@lawfirm.com',
      password: 'demo123',
      firmName: 'Demo Law Firm',
      annualRevenueGoal: 500000,
      annualLeadsGoal: 1000
    };

    return await this.setupSingleFirm(demoConfig);
  }

  /**
   * Update annual goals
   */
  static async updateAnnualGoals(userId: string, revenueGoal: number, leadsGoal: number): Promise<void> {
    await prisma.systemSettings.upsert({
      where: {
        userId_settingKey: {
          userId,
          settingKey: 'annual_goals'
        }
      },
      update: {
        settingValue: JSON.stringify({
          revenueGoal,
          leadsGoal,
          updatedDate: new Date().toISOString()
        })
      },
      create: {
        userId,
        settingKey: 'annual_goals',
        settingValue: JSON.stringify({
          revenueGoal,
          leadsGoal,
          setupDate: new Date().toISOString()
        })
      }
    });
  }
}