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
    const cachedData = await getCachedData();
    
    if (!cachedData) {
      return NextResponse.json(
        { 
          error: 'No firm metrics data available',
          message: 'Please run metrics calculation first'
        },
        { status: 404 }
      );
    }

    const data = cachedData;

    // Format revenue metrics from QB data
    const revenueMetrics = {
      weekly: formatCurrency(data.qb?.paymentsCollectedWeekly || 0),
      yearToDate: formatCurrency(data.qb?.revenueYTD || 0),
      averageCaseValue: formatCurrency(data.qb?.avgCaseValue || 0),
      goalProgress: {
        current: data.qb?.revenueYTD || 0,
        goal: 1000000, // Default annual goal
        percentage: Math.round(((data.qb?.revenueYTD || 0) / 1000000) * 100),
        onTrack: (data.qb?.revenueYTD || 0) > 500000,
        status: (data.qb?.revenueYTD || 0) > 500000 ? 'On Track' : 'Behind'
      }
    };

    // Format lead metrics from GHL data
    const leadMetrics = {
      weekly: data.ghl?.leadsWeekly || 0,
      yearToDate: data.ghl?.leadsYTD || 0,
      goalProgress: {
        current: data.ghl?.leadsYTD || 0,
        goal: 1000, // Default annual goal
        percentage: Math.round(((data.ghl?.leadsYTD || 0) / 1000) * 100),
        onTrack: (data.ghl?.leadsYTD || 0) > 500,
        status: (data.ghl?.leadsYTD || 0) > 500 ? 'On Track' : 'Behind'
      }
    };

    // Format conversion metrics from GHL data
    const conversionMetrics = {
      consultsScheduledPerLead: formatPercentage((data.ghl?.conversionRate || 0) / 100),
      retainersSignedPerConsult: formatPercentage(0.30), // Default 30% close rate
      overallConversionRate: formatPercentage(((data.ghl?.conversionRate || 0) * 0.30) / 100)
    };

    // Format marketing ROI metrics from GHL data  
    const marketingMetrics = {
      roiPercentage: formatPercentage((data.ghl?.roi || 0) / 100),
      clientAcquisitionCost: formatCurrency(500), // Default CAC
      roiStatus: (data.ghl?.roi || 0) > 300 ? 'Excellent' : 
                 (data.ghl?.roi || 0) > 200 ? 'Good' : 
                 (data.ghl?.roi || 0) > 100 ? 'Fair' : 'Poor'
    };

    // Format lead source breakdown from GHL data
    const leadSources = data.ghl?.leadSources ? Object.entries(data.ghl.leadSources).map(([source, count]) => ({
      source,
      count: count as number,
      percentage: Math.round(((count as number) / (data.ghl?.leadsYTD || 1)) * 100),
      formattedPercentage: formatPercentage(((count as number) / (data.ghl?.leadsYTD || 1)))
    })).sort((a, b) => b.count - a.count) : [];

    // Case and review metrics
    const activityMetrics = {
      newCasesSigned: {
        weekly: data.newCasesSignedWeekly,
        // YTD would need to be calculated from historical data
      },
      activeCases: data.activeCases,
      googleReviews: {
        weekly: data.googleReviewsWeekly,
        ytd: data.googleReviewsYTD
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
        lastUpdated: new Date().toISOString()
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