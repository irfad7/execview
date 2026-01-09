/**
 * Leads Tracking Dashboard API
 * Serves ongoing lead tracking and daily lead metrics
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

    // Get cached leads tracking data
    const cachedData = await getCachedData();
    
    if (!cachedData) {
      return NextResponse.json(
        { 
          error: 'No leads tracking data available',
          message: 'Please run metrics calculation first'
        },
        { status: 404 }
      );
    }

    const data = cachedData;

    // Format leads spreadsheet data from GHL opportunity feed
    const spreadsheetData = data.ghl?.opportunityFeed?.map((lead: any) => ({
      leadId: lead.id,
      ownerName: lead.owner,
      leadName: lead.contactName,
      dateCreated: formatDate(lead.date),
      phoneTime: formatPhoneTime(lead.timeOnPhone),
      pipelineStage: lead.pipelineStage,
      source: lead.source,
      daysOld: calculateDaysOld(lead.date)
    })) || [];

    // Group leads by pipeline stage
    const leadsByStage = spreadsheetData.reduce((acc: any, lead: any) => {
      const stage = lead.pipelineStage;
      if (!acc[stage]) {
        acc[stage] = [];
      }
      acc[stage].push(lead);
      return acc;
    }, {});

    // Group leads by source
    const leadsBySource = spreadsheetData.reduce((acc: any, lead: any) => {
      const source = lead.source;
      if (!acc[source]) {
        acc[source] = 0;
      }
      acc[source]++;
      return acc;
    }, {});

    // Calculate daily lead trends (last 7 days)
    const dailyLeads = calculateDailyLeads(spreadsheetData);

    // Lead activity summary
    const summary = {
      totalLeads: spreadsheetData.length,
      avgPhoneTime: data.ghl?.avgTimeOnPhone || '0m',
      leadsThisWeek: spreadsheetData.filter((lead: any) => 
        calculateDaysOld(lead.dateCreated) <= 7
      ).length,
      staleLeads: spreadsheetData.filter((lead: any) => 
        calculateDaysOld(lead.dateCreated) > 30
      ).length,
      hotLeads: spreadsheetData.filter((lead: any) => 
        lead.phoneTime > 10 && calculateDaysOld(lead.dateCreated) <= 7
      ).length
    };

    // Pipeline performance
    const pipelineStages = Object.keys(leadsByStage).map(stage => ({
      stage,
      count: leadsByStage[stage].length,
      percentage: Math.round((leadsByStage[stage].length / spreadsheetData.length) * 100),
      avgTimeInStage: calculateAverageTimeInStage(leadsByStage[stage])
    }));

    return NextResponse.json({
      success: true,
      data: {
        spreadsheet: spreadsheetData,
        summary,
        leadsByStage: pipelineStages,
        leadsBySource,
        dailyTrends: dailyLeads,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Leads tracking API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get leads tracking data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions
function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatPhoneTime(minutes: number): string {
  if (!minutes || minutes === 0) return '0 min';
  if (minutes < 60) return `${minutes} min`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return remainingMinutes > 0 
    ? `${hours}h ${remainingMinutes}m` 
    : `${hours}h`;
}

function calculateDaysOld(dateCreated: string | Date): number {
  const created = new Date(dateCreated);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - created.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function calculateAveragePhoneTime(leads: any[]): number {
  if (leads.length === 0) return 0;
  
  const totalPhoneTime = leads.reduce((sum, lead) => sum + (lead.phoneTime || 0), 0);
  return Math.round(totalPhoneTime / leads.length);
}

function calculateAverageTimeInStage(stageLeads: any[]): number {
  if (stageLeads.length === 0) return 0;
  
  const totalDays = stageLeads.reduce((sum, lead) => sum + lead.daysOld, 0);
  return Math.round(totalDays / stageLeads.length);
}

function calculateDailyLeads(leads: any[]): any[] {
  const dailyData: { [key: string]: number } = {};
  
  // Initialize last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    dailyData[dateKey] = 0;
  }
  
  // Count leads per day
  leads.forEach((lead: any) => {
    const leadDate = new Date(lead.dateCreated).toISOString().split('T')[0];
    if (dailyData.hasOwnProperty(leadDate)) {
      dailyData[leadDate]++;
    }
  });
  
  return Object.entries(dailyData).map(([date, count]) => ({
    date: formatDate(date),
    count
  }));
}