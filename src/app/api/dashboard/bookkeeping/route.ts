/**
 * Bookkeeping Dashboard API
 * Serves weekly bookkeeping metrics and closed cases data
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

    // Get cached bookkeeping data
    const cachedData = await getCachedData();
    
    if (!cachedData) {
      return NextResponse.json(
        { 
          error: 'No bookkeeping data available',
          message: 'Please run metrics calculation first'
        },
        { status: 404 }
      );
    }

    const data = cachedData;

    // Use enhanced Clio bookkeeping data if available, otherwise fallback to QB data
    let spreadsheetData: any[] = [];
    let summary: any = {};

    if (data.clioData?.bookkeeping) {
      // Use rich Clio bookkeeping data
      spreadsheetData = data.clio?.slice(0, 10).map((caseItem: any) => ({
        dateClosed: formatDate(caseItem.openDate), // Would be close date for closed cases
        matterName: caseItem.name,
        clientName: caseItem.clientName,
        caseNumber: caseItem.caseNumber,
        totalPaymentsCollected: formatCurrency(caseItem.outstandingBalance || 0)
      })) || [];

      summary = {
        totalCasesClosed: data.clioData.bookkeeping.casesClosedThisWeek,
        totalPaymentsCollected: data.clioData.bookkeeping.paymentsCollectedThisWeek,
        averagePaymentPerCase: data.clioData.bookkeeping.averageCaseValueYTD
      };
    } else {
      // Fallback to QB data
      spreadsheetData = data.qb?.recentCollections?.map((collection: any) => ({
        dateClosed: formatDate(collection.date),
        matterName: `Payment from ${collection.clientName}`,
        clientName: collection.clientName,
        caseNumber: collection.id,
        totalPaymentsCollected: formatCurrency(collection.amount)
      })) || [];

      summary = {
        totalCasesClosed: data.qb?.closedCasesWeekly || 0,
        totalPaymentsCollected: data.qb?.paymentsCollectedWeekly || 0,
        averagePaymentPerCase: data.qb?.avgCaseValue || 0
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        spreadsheet: spreadsheetData,
        summary: {
          totalCasesClosed: summary.totalCasesClosed,
          totalPaymentsCollected: formatCurrency(summary.totalPaymentsCollected),
          averagePaymentPerCase: formatCurrency(summary.averagePaymentPerCase)
        },
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Bookkeeping API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get bookkeeping data',
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