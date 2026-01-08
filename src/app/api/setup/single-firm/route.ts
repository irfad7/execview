/**
 * Single Firm Setup API Route
 * Initialize a complete law firm setup with intelligent defaults
 */

import { NextRequest, NextResponse } from 'next/server';
import { SingleFirmSetupService } from '../../../../lib/singleFirmSetup';
import { AuthService } from '../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      email, 
      password, 
      firmName,
      clioClientId,
      clioClientSecret,
      ghlClientId,
      ghlClientSecret,
      qbClientId,
      qbClientSecret,
      annualRevenueGoal,
      annualLeadsGoal
    } = body;

    // Validate required fields
    if (!email || !password || !firmName) {
      return NextResponse.json(
        { error: 'Email, password, and firm name are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    try {
      await AuthService.validateCredentials(email, password);
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 409 }
      );
    } catch (error) {
      // User doesn't exist, which is what we want for setup
    }

    // Set up the single firm
    const setupResult = await SingleFirmSetupService.setupSingleFirm({
      email,
      password,
      firmName,
      clioClientId,
      clioClientSecret,
      ghlClientId,
      ghlClientSecret,
      qbClientId,
      qbClientSecret,
      annualRevenueGoal: annualRevenueGoal || 500000,
      annualLeadsGoal: annualLeadsGoal || 1000
    });

    // Generate setup report
    const setupReport = await SingleFirmSetupService.generateSetupReport(setupResult.userId);

    return NextResponse.json({
      success: true,
      message: 'Single firm setup completed successfully',
      setup: setupResult,
      report: setupReport
    });

  } catch (error) {
    console.error('Single firm setup error:', error);
    return NextResponse.json(
      { 
        error: 'Setup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
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

    // Validate current setup
    const validation = await SingleFirmSetupService.validateSingleFirmSetup(user.id);
    const report = await SingleFirmSetupService.generateSetupReport(user.id);

    return NextResponse.json({
      success: true,
      userId: user.id,
      validation,
      report
    });

  } catch (error) {
    console.error('Setup validation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to validate setup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { revenueGoal, leadsGoal } = body;

    if (!revenueGoal || !leadsGoal) {
      return NextResponse.json(
        { error: 'Revenue goal and leads goal are required' },
        { status: 400 }
      );
    }

    // Update annual goals
    await SingleFirmSetupService.updateAnnualGoals(user.id, revenueGoal, leadsGoal);

    return NextResponse.json({
      success: true,
      message: 'Annual goals updated successfully',
      goals: {
        revenue: revenueGoal,
        leads: leadsGoal
      }
    });

  } catch (error) {
    console.error('Goals update error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update goals',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}