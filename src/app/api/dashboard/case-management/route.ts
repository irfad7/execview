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
    const cachedData = await getCachedData();
    
    if (!cachedData) {
      return NextResponse.json(
        { 
          error: 'No case management data available',
          message: 'Please run metrics calculation first'
        },
        { status: 404 }
      );
    }

    const data = cachedData;

    // Format for case management spreadsheet using Clio cases
    const spreadsheetData = data.clio?.map((caseItem: any) => ({
      caseId: caseItem.id,
      caseName: caseItem.name,
      matterName: caseItem.name,
      clientName: caseItem.clientName,
      chargeType: caseItem.chargeType,
      outstandingBalance: formatCurrency(caseItem.outstandingBalance),
      discoveryReceived: caseItem.discoveryReceived ? 'Yes' : 'No',
      discoveryStatus: caseItem.discoveryReceived ? 'normal' : 'red',
      pleaOfferReceived: caseItem.pleaOfferReceived ? 'Yes' : 'No',
      pleaOfferStatus: caseItem.pleaOfferReceived ? 'normal' : 'red',
      status: 'Active',
      openDate: formatDate(caseItem.openDate)
    })) || [];

    // Format upcoming court dates from Clio cases
    const courtDates = data.clio?.filter((c: any) => c.upcomingCourtDate).map((court: any) => ({
      caseId: court.id,
      caseName: court.name,
      courtDate: formatDate(court.upcomingCourtDate),
      eventType: 'Court Hearing',
      daysUntilCourt: Math.ceil((new Date(court.upcomingCourtDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      status: Math.ceil((new Date(court.upcomingCourtDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 7 ? 'red' : 'normal',
      urgencyLabel: Math.ceil((new Date(court.upcomingCourtDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 7 ? 'URGENT' : ''
    })) || [];

    // Dashboard summary
    const totalBalance = data.clio?.reduce((sum: number, c: any) => sum + (c.outstandingBalance || 0), 0) || 0;
    const noDiscoveryCount = data.clio?.filter((c: any) => !c.discoveryReceived).length || 0;
    const noPleaOfferCount = data.clio?.filter((c: any) => !c.pleaOfferReceived).length || 0;
    const totalCases = data.clio?.length || 0;

    const dashboard = {
      totalOutstandingBalance: formatCurrency(totalBalance),
      percentageNoDiscovery: totalCases > 0 ? Math.round((noDiscoveryCount / totalCases) * 100) : 0,
      percentageNoPleaOffer: totalCases > 0 ? Math.round((noPleaOfferCount / totalCases) * 100) : 0,
      casesByChargeType: {},
      totalOpenCases: totalCases,
      urgentCourtDates: courtDates.filter((c: any) => c.status === 'red').length
    };

    return NextResponse.json({
      success: true,
      data: {
        spreadsheet: spreadsheetData,
        courtDates,
        dashboard,
        lastUpdated: new Date().toISOString()
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