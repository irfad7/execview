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
    const cachedData = await getCachedData(user.id, 'bookkeeping');
    
    if (!cachedData) {
      return NextResponse.json(
        { 
          error: 'No bookkeeping data available',
          message: 'Please run metrics calculation first'
        },
        { status: 404 }
      );
    }

    const data = JSON.parse(cachedData);

    // Format for bookkeeping spreadsheet
    const spreadsheetData = data.weeklyClosedCases.map((closedCase: any) => ({
      dateClosed: formatDate(closedCase.dateClosed),
      matterName: closedCase.matterName,
      clientName: closedCase.clientName,
      caseNumber: closedCase.caseNumber,
      totalPaymentsCollected: formatCurrency(closedCase.totalPaymentsCollected)
    }));

    // Calculate summary statistics
    const summary = {
      totalCasesClosed: spreadsheetData.length,
      totalPaymentsCollected: data.weeklyClosedCases.reduce(
        (sum: number, caseItem: any) => sum + (caseItem.totalPaymentsCollected || 0), 
        0
      ),
      averagePaymentPerCase: spreadsheetData.length > 0 
        ? data.weeklyClosedCases.reduce((sum: number, caseItem: any) => sum + caseItem.totalPaymentsCollected, 0) / spreadsheetData.length
        : 0
    };

    return NextResponse.json({
      success: true,
      data: {
        spreadsheet: spreadsheetData,
        summary: {
          totalCasesClosed: summary.totalCasesClosed,
          totalPaymentsCollected: formatCurrency(summary.totalPaymentsCollected),
          averagePaymentPerCase: formatCurrency(summary.averagePaymentPerCase)
        },
        lastUpdated: data.lastUpdated
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