/**
 * Metrics Calculation API Route
 * Automatically calculate and cache all law firm metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../lib/auth';
import { MetricsEngine } from '../../../../lib/metricsEngine';
import { setCachedData, getApiConfigs } from '../../../../lib/dbActions';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await AuthService.validateSession(sessionCookie.value);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Get API configurations
    const apiConfigs = await getApiConfigs(user.id);
    
    const clioConfig = apiConfigs.find(config => config.service === 'clio');
    const ghlConfig = apiConfigs.find(config => config.service === 'gohighlevel');
    const qbConfig = apiConfigs.find(config => config.service === 'quickbooks');

    if (!clioConfig?.accessToken || !ghlConfig?.accessToken || !qbConfig?.accessToken) {
      return NextResponse.json(
        { 
          error: 'Missing API tokens',
          message: 'Please complete OAuth setup for all required services'
        },
        { status: 400 }
      );
    }

    // Initialize metrics engine with API tokens
    const metricsEngine = new MetricsEngine(
      clioConfig.accessToken,
      ghlConfig.accessToken, 
      qbConfig.accessToken,
      qbConfig.realmId || ''
    );

    // Calculate all metrics
    const weeklyMetrics = await metricsEngine.generateWeeklyMetrics();

    // Cache the calculated metrics
    await setCachedData(
      user.id,
      'weekly_metrics',
      JSON.stringify({
        ...weeklyMetrics,
        calculatedAt: new Date().toISOString(),
        weekOf: getStartOfWeek().toISOString()
      })
    );

    // Cache individual dashboard sections for faster loading
    await Promise.all([
      setCachedData(user.id, 'case_management', JSON.stringify({
        weeklyOpenCases: weeklyMetrics.weeklyOpenCases,
        upcomingCourtDates: weeklyMetrics.upcomingCourtDates,
        dashboard: weeklyMetrics.caseManagementDashboard,
        lastUpdated: new Date().toISOString()
      })),
      
      setCachedData(user.id, 'bookkeeping', JSON.stringify({
        weeklyClosedCases: weeklyMetrics.weeklyClosedCases,
        lastUpdated: new Date().toISOString()
      })),
      
      setCachedData(user.id, 'firm_metrics', JSON.stringify({
        ...weeklyMetrics.firmMetrics,
        lastUpdated: new Date().toISOString()
      })),
      
      setCachedData(user.id, 'leads_tracking', JSON.stringify({
        leadsSpreadsheet: weeklyMetrics.leadsSpreadsheet,
        lastUpdated: new Date().toISOString()
      }))
    ]);

    // Generate summary statistics for the response
    const summary = {
      totalOpenCases: weeklyMetrics.weeklyOpenCases.length,
      urgentCourtDates: weeklyMetrics.upcomingCourtDates.filter(c => c.isUrgent).length,
      weeklyRevenue: weeklyMetrics.firmMetrics.weeklyRevenue,
      weeklyLeads: weeklyMetrics.firmMetrics.weeklyLeads,
      activeCases: weeklyMetrics.firmMetrics.activeCases,
      outstandingBalance: weeklyMetrics.caseManagementDashboard.totalOutstandingBalance
    };

    return NextResponse.json({
      success: true,
      message: 'Metrics calculated successfully',
      summary,
      calculatedAt: new Date().toISOString(),
      weekOf: getStartOfWeek().toISOString()
    });

  } catch (error) {
    console.error('Metrics calculation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to calculate metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await AuthService.validateSession(sessionCookie.value);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Get cached metrics status
    const cacheKeys = ['weekly_metrics', 'case_management', 'bookkeeping', 'firm_metrics', 'leads_tracking'];
    const cacheStatus: { [key: string]: any } = {};

    for (const key of cacheKeys) {
      try {
        const cached = await getCachedData(user.id, key);
        if (cached) {
          const data = JSON.parse(cached);
          cacheStatus[key] = {
            exists: true,
            lastUpdated: data.lastUpdated || data.calculatedAt,
            recordCount: getRecordCount(data, key)
          };
        } else {
          cacheStatus[key] = {
            exists: false,
            lastUpdated: null,
            recordCount: 0
          };
        }
      } catch (error) {
        cacheStatus[key] = {
          exists: false,
          error: 'Invalid cache data'
        };
      }
    }

    return NextResponse.json({
      success: true,
      cacheStatus,
      needsRecalculation: Object.values(cacheStatus).some(status => !status.exists)
    });

  } catch (error) {
    console.error('Metrics status error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get metrics status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions
function getStartOfWeek(): Date {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day;
  return new Date(today.setDate(diff));
}

function getRecordCount(data: any, cacheKey: string): number {
  switch (cacheKey) {
    case 'case_management':
      return (data.weeklyOpenCases?.length || 0) + (data.upcomingCourtDates?.length || 0);
    case 'bookkeeping':
      return data.weeklyClosedCases?.length || 0;
    case 'leads_tracking':
      return data.leadsSpreadsheet?.length || 0;
    case 'firm_metrics':
      return 1; // Single metrics object
    case 'weekly_metrics':
      return (data.weeklyOpenCases?.length || 0) + 
             (data.weeklyClosedCases?.length || 0) + 
             (data.leadsSpreadsheet?.length || 0);
    default:
      return 0;
  }
}

// Import getCachedData function
async function getCachedData(userId: string, cacheKey: string): Promise<string | null> {
  // This should be imported from dbActions, but avoiding import issues for now
  const { getCachedData: getCached } = await import('../../../../lib/dbActions');
  return getCached(userId, cacheKey);
}