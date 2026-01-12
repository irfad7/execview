/**
 * Metrics Calculation Engine  
 * Automatically calculates all required law firm metrics using direct API integrations
 */

export interface WeeklyMetrics {
  // Case Management Metrics
  weeklyOpenCases: CaseMetric[];
  upcomingCourtDates: CourtDate[];
  caseManagementDashboard: CaseManagementDashboard;
  
  // Bookkeeping Metrics
  weeklyClosedCases: ClosedCase[];
  
  // Firm Metrics
  firmMetrics: FirmMetrics;
  
  // Ongoing Tracking
  leadsSpreadsheet: LeadMetric[];
}

export interface CaseMetric {
  caseId: string;
  caseName: string;
  matterName: string;
  clientName: string;
  chargeType: string;
  outstandingBalance: number;
  discoveryReceived: boolean;
  pleaOfferReceived: boolean;
  status: string;
  openDate: Date;
}

export interface CourtDate {
  caseId: string;
  caseName: string;
  courtDate: Date;
  eventType: string;
  daysUntilCourt: number;
  isUrgent: boolean; // < 7 days
}

export interface CaseManagementDashboard {
  totalOutstandingBalance: number;
  percentageNoDiscovery: number;
  percentageNoPleaOffer: number;
  casesByChargeType: { [chargeType: string]: number };
}

export interface ClosedCase {
  dateClosed: Date;
  matterName: string;
  clientName: string;
  caseNumber: string;
  totalPaymentsCollected: number;
}

export interface FirmMetrics {
  totalYtdRevenue: number;
  weeklyRevenue: number;
  averageCaseValueYtd: number;
  weeklyLeads: number;
  ytdLeads: number;
  conversionRate: {
    consultsScheduledPerLead: number;
    retainersSignedPerConsult: number;
  };
  marketingRoi: {
    roiPercentage: number;
    clientAcquisitionCost: number;
  };
  leadSourceBreakdown: { [source: string]: number };
  weeklyGoogleReviews: number;
  weeklyNewCasesSigned: number;
  activeCases: number;
  annualGoals: {
    revenueGoal: number;
    revenueOnTrack: boolean;
    leadsGoal: number;
    leadsOnTrack: boolean;
  };
}

export interface LeadMetric {
  leadId: string;
  ownerName: string;
  leadName: string;
  dateCreated: Date;
  phoneTime: number;
  pipelineStage: string;
  source: string;
}

export class MetricsEngine {
  /**
   * Calculate comprehensive weekly metrics using direct API data
   */
  static async calculateWeeklyMetrics(userId: string): Promise<WeeklyMetrics> {
    try {
      // Use existing API endpoints that already handle the complex data fetching
      const [caseData, bookkeepingData, firmData, leadsData] = await Promise.all([
        fetch('/api/dashboard/case-management').then(r => r.json()),
        fetch('/api/dashboard/bookkeeping').then(r => r.json()),
        fetch('/api/dashboard/firm-metrics').then(r => r.json()),
        fetch('/api/dashboard/leads-tracking').then(r => r.json())
      ]);

      return {
        weeklyOpenCases: caseData.weeklyOpenCases || [],
        upcomingCourtDates: caseData.upcomingCourtDates || [],
        caseManagementDashboard: caseData.dashboard || {
          totalOutstandingBalance: 0,
          percentageNoDiscovery: 0,
          percentageNoPleaOffer: 0,
          casesByChargeType: {}
        },
        weeklyClosedCases: bookkeepingData.weeklyClosedCases || [],
        firmMetrics: firmData || {
          totalYtdRevenue: 0,
          weeklyRevenue: 0,
          averageCaseValueYtd: 0,
          weeklyLeads: 0,
          ytdLeads: 0,
          conversionRate: {
            consultsScheduledPerLead: 0,
            retainersSignedPerConsult: 0
          },
          marketingRoi: {
            roiPercentage: 0,
            clientAcquisitionCost: 0
          },
          leadSourceBreakdown: {},
          weeklyGoogleReviews: 0,
          weeklyNewCasesSigned: 0,
          activeCases: 0,
          annualGoals: {
            revenueGoal: 100000,
            revenueOnTrack: false,
            leadsGoal: 1000,
            leadsOnTrack: false
          }
        },
        leadsSpreadsheet: leadsData.leads || []
      };

    } catch (error) {
      console.error('Error calculating metrics:', error);
      
      // Return empty metrics structure on error
      return {
        weeklyOpenCases: [],
        upcomingCourtDates: [],
        caseManagementDashboard: {
          totalOutstandingBalance: 0,
          percentageNoDiscovery: 0,
          percentageNoPleaOffer: 0,
          casesByChargeType: {}
        },
        weeklyClosedCases: [],
        firmMetrics: {
          totalYtdRevenue: 0,
          weeklyRevenue: 0,
          averageCaseValueYtd: 0,
          weeklyLeads: 0,
          ytdLeads: 0,
          conversionRate: {
            consultsScheduledPerLead: 0,
            retainersSignedPerConsult: 0
          },
          marketingRoi: {
            roiPercentage: 0,
            clientAcquisitionCost: 0
          },
          leadSourceBreakdown: {},
          weeklyGoogleReviews: 0,
          weeklyNewCasesSigned: 0,
          activeCases: 0,
          annualGoals: {
            revenueGoal: 100000,
            revenueOnTrack: false,
            leadsGoal: 1000,
            leadsOnTrack: false
          }
        },
        leadsSpreadsheet: []
      };
    }
  }
}