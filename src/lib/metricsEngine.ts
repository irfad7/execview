/**
 * Metrics Calculation Engine
 * Automatically calculates all required law firm metrics using intelligent field mapping
 */

import { DEFAULT_FIELD_MAPPINGS, FIELD_TRANSFORMATIONS, FIELD_VALIDATIONS } from '../config/defaultFieldMappings';
import { ClioConnector } from '../integrations/clio/client';
import { GoHighLevelConnector } from '../integrations/gohighlevel/client';
import { QuickBooksConnector } from '../integrations/quickbooks/client';

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
  private clio: ClioConnector;
  private ghl: GoHighLevelConnector;
  private quickbooks: QuickBooksConnector;

  constructor(
    clioToken: string,
    ghlToken: string,
    quickbooksToken: string,
    quickbooksRealmId: string,
    ghlLocationId?: string
  ) {
    this.clio = new ClioConnector(clioToken);
    this.ghl = new GoHighLevelConnector(ghlToken, ghlLocationId);
    this.quickbooks = new QuickBooksConnector(quickbooksToken);
  }

  /**
   * Generate complete weekly metrics report
   */
  async generateWeeklyMetrics(): Promise<WeeklyMetrics> {
    const startOfWeek = this.getStartOfWeek();
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);

    // Fetch all data in parallel
    const [
      clioMatters,
      clioCalendarEvents,
      clioActivities,
      ghlOpportunities,
      ghlContacts,
      qbInvoices,
      qbPayments,
      qbExpenses
    ] = await Promise.all([
      this.clio.fetchMetrics(),
      this.fetchClioCalendarEvents(),
      this.fetchClioActivities(),
      this.ghl.fetchMetrics(),
      this.fetchGhlContacts(),
      this.quickbooks.fetchMetrics(),
      this.fetchQbPayments(),
      this.fetchQbExpenses()
    ]);

    // Extract data from responses - each connector may return different formats
    const extractData = (response: any, fallback: any[] = []) => {
      if (Array.isArray(response)) return response;
      if (response?.data?.matters) return response.data.matters;
      if (response?.data?.opportunities) return response.data.opportunities;
      if (response?.data?.contacts) return response.data.contacts;
      if (response?.data) return response.data;
      return fallback;
    };

    // Process data using intelligent field mapping
    const processedData = {
      cases: this.mapClioData(extractData(clioMatters), 'cases'),
      calendar: this.mapClioData(extractData(clioCalendarEvents), 'calendar'),
      activities: this.mapClioData(extractData(clioActivities), 'activities'),
      opportunities: this.mapGhlData(extractData(ghlOpportunities), 'opportunities'),
      leads: this.mapGhlData(extractData(ghlContacts), 'leads'),
      invoices: this.mapQbData(extractData(qbInvoices), 'revenue'),
      payments: this.mapQbData(extractData(qbPayments), 'payments'),
      expenses: this.mapQbData(extractData(qbExpenses), 'expenses')
    };

    // Calculate all metrics
    return {
      weeklyOpenCases: this.calculateWeeklyOpenCases(processedData.cases),
      upcomingCourtDates: this.calculateUpcomingCourtDates(processedData.calendar),
      caseManagementDashboard: this.calculateCaseManagementDashboard(
        processedData.cases,
        processedData.activities
      ),
      weeklyClosedCases: this.calculateWeeklyClosedCases(
        processedData.cases,
        processedData.payments,
        startOfWeek
      ),
      firmMetrics: await this.calculateFirmMetrics(processedData, startOfWeek, startOfYear),
      leadsSpreadsheet: this.calculateLeadsSpreadsheet(
        processedData.leads,
        processedData.opportunities
      )
    };
  }

  /**
   * Map data using intelligent field mappings
   */
  private mapClioData(rawData: any[], category: string): any[] {
    const mapping = DEFAULT_FIELD_MAPPINGS.find(
      m => m.system === 'clio' && m.category === category
    );
    
    if (!mapping) return rawData;

    return rawData.map(item => this.transformDataItem(item, mapping.mappings));
  }

  private mapGhlData(rawData: any[], category: string): any[] {
    const mapping = DEFAULT_FIELD_MAPPINGS.find(
      m => m.system === 'gohighlevel' && m.category === category
    );
    
    if (!mapping) return rawData;

    return rawData.map(item => this.transformDataItem(item, mapping.mappings));
  }

  private mapQbData(rawData: any[], category: string): any[] {
    const mapping = DEFAULT_FIELD_MAPPINGS.find(
      m => m.system === 'quickbooks' && m.category === category
    );
    
    if (!mapping) return rawData;

    return rawData.map(item => this.transformDataItem(item, mapping.mappings));
  }

  /**
   * Transform individual data item using field mappings
   */
  private transformDataItem(item: any, mappings: any): any {
    const transformed: any = {};

    Object.entries(mappings).forEach(([key, mapping]: [string, any]) => {
      let value = this.getNestedValue(item, mapping.apiField);

      // Apply transformations if specified
      if (mapping.transformation && FIELD_TRANSFORMATIONS[mapping.transformation as keyof typeof FIELD_TRANSFORMATIONS]) {
        value = (FIELD_TRANSFORMATIONS as any)[mapping.transformation](value);
      }

      // Apply validations if specified
      if (mapping.validation && FIELD_VALIDATIONS[mapping.validation as keyof typeof FIELD_VALIDATIONS]) {
        value = (FIELD_VALIDATIONS as any)[mapping.validation](value);
      }

      // Convert data types
      value = this.convertDataType(value, mapping.dataType);

      transformed[key] = value;
    });

    return transformed;
  }

  /**
   * Get nested object value using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Convert value to specified data type
   */
  private convertDataType(value: any, dataType: string): any {
    if (value === null || value === undefined) return null;

    switch (dataType) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value) || 0;
      case 'date':
        return new Date(value);
      case 'boolean':
        return Boolean(value);
      case 'currency':
        return Number(value) || 0;
      default:
        return value;
    }
  }

  /**
   * Calculate weekly open cases
   */
  private calculateWeeklyOpenCases(cases: any[]): CaseMetric[] {
    return cases
      .filter(c => c.status === 'Open' || c.status === 'Active')
      .map(c => {
        // Find discovery and plea offer status from activities
        const discoveryReceived = c.discoveryReceived || false;
        const pleaOfferReceived = c.pleaOfferReceived || false;

        return {
          caseId: c.caseId,
          caseName: c.caseName,
          matterName: c.matterName,
          clientName: c.clientName,
          chargeType: c.chargeType,
          outstandingBalance: c.outstandingBalance,
          discoveryReceived,
          pleaOfferReceived,
          status: c.status,
          openDate: c.openDate
        };
      });
  }

  /**
   * Calculate upcoming court dates
   */
  private calculateUpcomingCourtDates(calendar: any[]): CourtDate[] {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    return calendar
      .filter(event => {
        const courtDate = new Date(event.courtDate);
        return courtDate >= today && courtDate <= thirtyDaysFromNow;
      })
      .map(event => {
        const courtDate = new Date(event.courtDate);
        const daysUntilCourt = Math.ceil((courtDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        
        return {
          caseId: event.matterId,
          caseName: event.matterId, // Will be enriched from cases data
          courtDate,
          eventType: event.eventType,
          daysUntilCourt,
          isUrgent: daysUntilCourt <= 7
        };
      })
      .sort((a, b) => a.courtDate.getTime() - b.courtDate.getTime());
  }

  /**
   * Calculate case management dashboard metrics
   */
  private calculateCaseManagementDashboard(cases: any[], activities: any[]): CaseManagementDashboard {
    const openCases = cases.filter(c => c.status === 'Open' || c.status === 'Active');
    
    const totalOutstandingBalance = openCases.reduce(
      (sum, c) => sum + (c.outstandingBalance || 0), 0
    );

    const casesWithoutDiscovery = openCases.filter(c => !c.discoveryReceived).length;
    const casesWithoutPleaOffer = openCases.filter(c => !c.pleaOfferReceived).length;

    const percentageNoDiscovery = openCases.length > 0 
      ? (casesWithoutDiscovery / openCases.length) * 100 
      : 0;

    const percentageNoPleaOffer = openCases.length > 0
      ? (casesWithoutPleaOffer / openCases.length) * 100
      : 0;

    const casesByChargeType: { [key: string]: number } = {};
    openCases.forEach(c => {
      const chargeType = c.chargeType || 'Unknown';
      casesByChargeType[chargeType] = (casesByChargeType[chargeType] || 0) + 1;
    });

    return {
      totalOutstandingBalance,
      percentageNoDiscovery,
      percentageNoPleaOffer,
      casesByChargeType
    };
  }

  /**
   * Calculate weekly closed cases with payments
   */
  private calculateWeeklyClosedCases(cases: any[], payments: any[], startOfWeek: Date): ClosedCase[] {
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);

    return cases
      .filter(c => {
        if (!c.closeDate) return false;
        const closeDate = new Date(c.closeDate);
        return closeDate >= startOfWeek && closeDate < endOfWeek;
      })
      .map(c => {
        // Calculate total payments for this case
        const casePayments = payments.filter(p => p.customerId === c.clientId);
        const totalPaymentsCollected = casePayments.reduce(
          (sum, p) => sum + (p.amount || 0), 0
        );

        return {
          dateClosed: new Date(c.closeDate),
          matterName: c.matterName,
          clientName: c.clientName,
          caseNumber: c.caseName,
          totalPaymentsCollected
        };
      })
      .sort((a, b) => b.dateClosed.getTime() - a.dateClosed.getTime());
  }

  /**
   * Calculate comprehensive firm metrics
   */
  private async calculateFirmMetrics(data: any, startOfWeek: Date, startOfYear: Date): Promise<FirmMetrics> {
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
    const today = new Date();

    // Revenue calculations
    const ytdPayments = data.payments.filter((p: any) => new Date(p.paymentDate) >= startOfYear);
    const weeklyPayments = data.payments.filter((p: any) => {
      const paymentDate = new Date(p.paymentDate);
      return paymentDate >= startOfWeek && paymentDate < endOfWeek;
    });

    const totalYtdRevenue = ytdPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const weeklyRevenue = weeklyPayments.reduce((sum: number, p: any) => sum + p.amount, 0);

    // Average case value
    const closedCases = data.cases.filter((c: any) => c.closeDate && new Date(c.closeDate) >= startOfYear);
    const averageCaseValueYtd = closedCases.length > 0 
      ? totalYtdRevenue / closedCases.length 
      : 0;

    // Lead calculations
    const ytdLeads = data.leads.filter((l: any) => new Date(l.createdDate) >= startOfYear);
    const weeklyLeads = data.leads.filter((l: any) => {
      const leadDate = new Date(l.createdDate);
      return leadDate >= startOfWeek && leadDate < endOfWeek;
    }).length;

    // Conversion rates
    const consultsScheduled = data.opportunities.filter((o: any) => o.consultScheduled).length;
    const retainersSigned = data.opportunities.filter((o: any) => o.retainerSigned).length;
    
    const conversionRate = {
      consultsScheduledPerLead: ytdLeads.length > 0 ? consultsScheduled / ytdLeads.length : 0,
      retainersSignedPerConsult: consultsScheduled > 0 ? retainersSigned / consultsScheduled : 0
    };

    // Marketing ROI
    const adExpenses = data.expenses.filter((e: any) => e.isAdvertising);
    const totalAdSpend = adExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    const marketingRoi = {
      roiPercentage: totalAdSpend > 0 ? (totalYtdRevenue / totalAdSpend) * 100 : 0,
      clientAcquisitionCost: retainersSigned > 0 ? totalAdSpend / retainersSigned : 0
    };

    // Lead source breakdown
    const leadSourceBreakdown: { [key: string]: number } = {};
    ytdLeads.forEach((l: any) => {
      const source = l.source || 'Unknown';
      leadSourceBreakdown[source] = (leadSourceBreakdown[source] || 0) + 1;
    });

    // Convert to percentages
    Object.keys(leadSourceBreakdown).forEach(source => {
      leadSourceBreakdown[source] = (leadSourceBreakdown[source] / ytdLeads.length) * 100;
    });

    // Active cases
    const activeCases = data.cases.filter((c: any) => c.status === 'Open' || c.status === 'Active').length;

    // Annual goals (configurable)
    const annualGoals = {
      revenueGoal: 500000, // $500K goal - configurable
      revenueOnTrack: this.isOnTrackForGoal(totalYtdRevenue, 500000, startOfYear),
      leadsGoal: 1000, // 1000 leads goal - configurable  
      leadsOnTrack: this.isOnTrackForGoal(ytdLeads.length, 1000, startOfYear)
    };

    return {
      totalYtdRevenue,
      weeklyRevenue,
      averageCaseValueYtd,
      weeklyLeads: weeklyLeads,
      ytdLeads: ytdLeads.length,
      conversionRate,
      marketingRoi,
      leadSourceBreakdown,
      weeklyGoogleReviews: 0, // TODO: Implement Google reviews tracking
      weeklyNewCasesSigned: retainersSigned,
      activeCases,
      annualGoals
    };
  }

  /**
   * Calculate leads spreadsheet data
   */
  private calculateLeadsSpreadsheet(leads: any[], opportunities: any[]): LeadMetric[] {
    return leads.map((lead: any) => {
      const opportunity = opportunities.find((o: any) => o.contactId === lead.leadId);
      
      return {
        leadId: lead.leadId,
        ownerName: 'Law Firm', // TODO: Get from actual owner data
        leadName: lead.leadName,
        dateCreated: new Date(lead.createdDate),
        phoneTime: lead.phoneTime || 0,
        pipelineStage: opportunity?.stageName || 'New Lead',
        source: lead.source
      };
    });
  }

  /**
   * Helper functions
   */
  private getStartOfWeek(): Date {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    return new Date(today.setDate(diff));
  }

  private isOnTrackForGoal(currentValue: number, goalValue: number, startOfYear: Date): boolean {
    const today = new Date();
    const daysInYear = new Date(today.getFullYear(), 11, 31).getDate() === 31 ? 366 : 365;
    const daysPassed = Math.ceil((today.getTime() - startOfYear.getTime()) / (1000 * 3600 * 24));
    const expectedProgress = (daysPassed / daysInYear) * goalValue;
    
    return currentValue >= expectedProgress * 0.9; // 90% of expected progress = on track
  }

  /**
   * API fetch methods (placeholders - implement based on actual API structures)
   */
  private async fetchClioCalendarEvents(): Promise<any[]> {
    // Implementation will depend on Clio's calendar API
    return [];
  }

  private async fetchClioActivities(): Promise<any[]> {
    // Implementation will depend on Clio's activities API
    return [];
  }

  private async fetchGhlContacts(): Promise<any[]> {
    // Implementation will depend on GHL's contacts API
    return [];
  }

  private async fetchQbPayments(): Promise<any[]> {
    // Implementation will depend on QuickBooks payments API
    return [];
  }

  private async fetchQbExpenses(): Promise<any[]> {
    // Implementation will depend on QuickBooks expenses API  
    return [];
  }
}