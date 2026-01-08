/**
 * Firm Metrics Dashboard API
 * Serves comprehensive firm performance metrics with annual goal tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../lib/auth';
import { getCachedData } from '../../../../lib/dbActions';

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

    // Get cached firm metrics data
    const cachedData = await getCachedData(user.id, 'firm_metrics');
    
    if (!cachedData) {
      return NextResponse.json(
        { 
          error: 'No firm metrics data available',
          message: 'Please run metrics calculation first'
        },
        { status: 404 }
      );
    }

    const data = JSON.parse(cachedData);

    // Format revenue metrics
    const revenueMetrics = {
      weekly: formatCurrency(data.weeklyRevenue),
      yearToDate: formatCurrency(data.totalYtdRevenue),
      averageCaseValue: formatCurrency(data.averageCaseValueYtd),
      goalProgress: {
        current: data.totalYtdRevenue,
        goal: data.annualGoals.revenueGoal,
        percentage: Math.round((data.totalYtdRevenue / data.annualGoals.revenueGoal) * 100),
        onTrack: data.annualGoals.revenueOnTrack,
        status: data.annualGoals.revenueOnTrack ? 'On Track' : 'Behind'
      }
    };

    // Format lead metrics
    const leadMetrics = {
      weekly: data.weeklyLeads,
      yearToDate: data.ytdLeads,
      goalProgress: {
        current: data.ytdLeads,
        goal: data.annualGoals.leadsGoal,
        percentage: Math.round((data.ytdLeads / data.annualGoals.leadsGoal) * 100),
        onTrack: data.annualGoals.leadsOnTrack,
        status: data.annualGoals.leadsOnTrack ? 'On Track' : 'Behind'
      }
    };

    // Format conversion metrics
    const conversionMetrics = {
      consultsScheduledPerLead: formatPercentage(data.conversionRate.consultsScheduledPerLead),
      retainersSignedPerConsult: formatPercentage(data.conversionRate.retainersSignedPerConsult),
      overallConversionRate: formatPercentage(
        data.conversionRate.consultsScheduledPerLead * data.conversionRate.retainersSignedPerConsult
      )
    };

    // Format marketing ROI metrics
    const marketingMetrics = {
      roiPercentage: formatPercentage(data.marketingRoi.roiPercentage / 100), // Convert to decimal percentage
      clientAcquisitionCost: formatCurrency(data.marketingRoi.clientAcquisitionCost),
      roiStatus: data.marketingRoi.roiPercentage > 300 ? 'Excellent' : 
                 data.marketingRoi.roiPercentage > 200 ? 'Good' : 
                 data.marketingRoi.roiPercentage > 100 ? 'Fair' : 'Poor'
    };

    // Format lead source breakdown
    const leadSources = Object.entries(data.leadSourceBreakdown).map(([source, percentage]) => ({
      source,
      percentage: Math.round(percentage as number),
      formattedPercentage: formatPercentage((percentage as number) / 100)
    })).sort((a, b) => b.percentage - a.percentage);

    // Case and review metrics
    const activityMetrics = {
      newCasesSigned: {
        weekly: data.weeklyNewCasesSigned,
        // YTD would need to be calculated from historical data
      },
      activeCases: data.activeCases,
      googleReviews: {
        weekly: data.weeklyGoogleReviews,
        // YTD would need to be calculated from historical data
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        revenue: revenueMetrics,
        leads: leadMetrics,
        conversion: conversionMetrics,
        marketing: marketingMetrics,
        leadSources,
        activity: activityMetrics,
        lastUpdated: data.lastUpdated
      }
    });

  } catch (error) {
    console.error('Firm metrics API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get firm metrics data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

function formatPercentage(decimal: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 1
  }).format(decimal || 0);
}