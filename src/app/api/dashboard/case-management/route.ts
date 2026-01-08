/**
 * Case Management Dashboard API
 * Serves case management metrics and spreadsheets
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

    // Get cached case management data
    const cachedData = await getCachedData(user.id, 'case_management');
    
    if (!cachedData) {
      return NextResponse.json(
        { 
          error: 'No case management data available',
          message: 'Please run metrics calculation first'
        },
        { status: 404 }
      );
    }

    const data = JSON.parse(cachedData);

    // Format for case management spreadsheet
    const spreadsheetData = data.weeklyOpenCases.map((caseItem: any) => ({
      caseId: caseItem.caseId,
      caseName: caseItem.caseName,
      matterName: caseItem.matterName,
      clientName: caseItem.clientName,
      chargeType: caseItem.chargeType,
      outstandingBalance: formatCurrency(caseItem.outstandingBalance),
      discoveryReceived: caseItem.discoveryReceived ? 'Yes' : 'No',
      discoveryStatus: caseItem.discoveryReceived ? 'normal' : 'red',
      pleaOfferReceived: caseItem.pleaOfferReceived ? 'Yes' : 'No',
      pleaOfferStatus: caseItem.pleaOfferReceived ? 'normal' : 'red',
      status: caseItem.status,
      openDate: formatDate(caseItem.openDate)
    }));

    // Format upcoming court dates
    const courtDates = data.upcomingCourtDates.map((court: any) => ({
      caseId: court.caseId,
      caseName: court.caseName,
      courtDate: formatDate(court.courtDate),
      eventType: court.eventType,
      daysUntilCourt: court.daysUntilCourt,
      status: court.isUrgent ? 'red' : 'normal',
      urgencyLabel: court.isUrgent ? 'URGENT' : ''
    }));

    // Dashboard summary
    const dashboard = {
      totalOutstandingBalance: formatCurrency(data.dashboard.totalOutstandingBalance),
      percentageNoDiscovery: Math.round(data.dashboard.percentageNoDiscovery),
      percentageNoPleaOffer: Math.round(data.dashboard.percentageNoPleaOffer),
      casesByChargeType: data.dashboard.casesByChargeType,
      totalOpenCases: spreadsheetData.length,
      urgentCourtDates: courtDates.filter((c: any) => c.status === 'red').length
    };

    return NextResponse.json({
      success: true,
      data: {
        spreadsheet: spreadsheetData,
        courtDates,
        dashboard,
        lastUpdated: data.lastUpdated
      }
    });

  } catch (error) {
    console.error('Case management API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get case management data',
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
    currency: 'USD'
  }).format(amount || 0);
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}