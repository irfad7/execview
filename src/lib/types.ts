export interface ClioCase {
    id: string;
    name: string;
    clientName: string;
    caseNumber: string;
    chargeType: string;
    type: string;
    status: string;
    openDate: string;
    upcomingCourtDate?: string;
    outstandingBalance: number;
    discoveryReceived: boolean;
    pleaOfferReceived: boolean;
}

export interface ClioData {
    caseManagement: {
        totalOpenCases: number;
        casesByChargeType: Record<string, number>;
        totalOutstandingBalance: number;
        casesWithoutDiscovery: number;
        casesWithoutPleaOffer: number;
        percentNoDiscovery: number;
        percentNoPleaOffer: number;
    };
    upcomingCourtDates: Array<{
        caseId: string;
        caseName: string;
        date: string;
        daysUntil: number;
        isUrgent: boolean;
        summary: string;
    }>;
    bookkeeping: {
        casesClosedThisWeek: number;
        paymentsCollectedThisWeek: number;
        averageCaseValueYTD: number;
    };
}

export interface GHLMetric {
    leadsWeekly: number;
    leadsYTD: number;
    opportunitiesWeekly: number;
    opportunitiesYTD: number;
    totalOpportunities: number;
    totalContacts: number;
    consultsScheduled: number;
    consultationsWeekly?: number;
    openOpportunities?: number;
    retainersSigned: number;
    adSpend?: number;
    feesCollected?: number;
    conversionRate: number;
    closeRate: number;
    roi?: number;
    leadSources: { [key: string]: number };
    opportunityFeed: Array<{
        id: string;
        lead: string;
        contactName: string;
        date: string;
        timeOnPhone: string;
        stage: string;
        pipelineStage: string;
        source: string;
        owner: string;
        value?: number;
        status?: string;
    }>;
    avgTimeOnPhone: string;
}

export interface QBTransaction {
    id: string;
    type: 'deposit' | 'payment' | 'salesReceipt' | 'invoice';
    clientName: string;
    amount: number;
    date: string;
    account?: string;
}

export interface QBMetric {
    revenueYTD: number;
    adSpendYTD: number;
    closedCasesWeekly: number;
    avgCaseValue: number;
    paymentsCollectedWeekly: number;
    recentCollections: Array<{ id: string; clientName: string; amount: number; date: string; type?: string }>;
    // All transactions for date filtering
    transactions: QBTransaction[];
}

export interface FirmMetrics {
    activeCases: number;
    googleReviewsWeekly: number;
    googleReviewsYTD: number;
    newCasesSignedWeekly: number;
    newCasesSignedYTD: number;
    clio: ClioCase[];
    clioData?: ClioData;
    ghl: GHLMetric;
    qb: QBMetric;
    weeklyClosedCases?: number;
    paymentsCollectedWeekly?: number;
    avgCaseValue?: number;
}
