/**
 * Metrics Calculation API Route
 * Automatically calculate and cache all law firm metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../lib/auth';
import { MetricsEngine } from '../../../../lib/metricsEngine';
import { setCachedData, getApiConfigs, getCachedData } from '../../../../lib/dbActions';

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

    // Calculate all metrics using the simplified engine
    const weeklyMetrics = await MetricsEngine.calculateWeeklyMetrics(user.id);

    // Cache the calculated metrics
    await setCachedData({
      ...weeklyMetrics,
      calculatedAt: new Date().toISOString(),
      weekOf: getStartOfWeek().toISOString()
    });

    // Cache is now set above with the main dashboard data

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

    // Get the main cached data  
    try {
      const cachedData = await getCachedData();
      if (cachedData) {
        cacheStatus['dashboard'] = {
          exists: true,
          lastUpdated: new Date().toISOString(),
          recordCount: 1
        };
      } else {
        cacheStatus['dashboard'] = {
          exists: false,
          lastUpdated: null,
          recordCount: 0
        };
      }
    } catch (error) {
      cacheStatus['dashboard'] = {
        exists: false,
        lastUpdated: null,
        recordCount: 0,
        error: 'Failed to load'
      };
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

