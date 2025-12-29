export interface ClioCase {
    id: string;
    name: string;
    clientName: string;
    caseNumber: string;
    chargeType: "Hourly" | "Flat Fee" | "Contingency";
    type: "Felony" | "Misdemeanor" | "DUI" | "Traffic" | "Expungement";
    openDate: string;
    upcomingCourtDate?: string;
    outstandingBalance: number;
    discoveryReceived: boolean;
    pleaOfferReceived: boolean;
}

export interface GHLMetric {
    leadsWeekly: number;
    leadsYTD: number;
    consultsScheduled: number;
    retainersSigned: number;
    adSpend: number;
    feesCollected: number;
    consultationsWeekly: number;
    conversionRate: number;
    roi: number;
    leadSources: Array<{ source: string; count: number; percentage: number }>;
    opportunityFeed: Array<{ id: string; contactName: string; date: string; timeOnPhone: string; pipelineStage: string; source: string; owner: string }>;
    avgTimeOnPhone: string;
}

export interface QBMetric {
    revenueYTD: number;
    closedCasesWeekly: number;
    avgCaseValue: number;
    paymentsCollectedWeekly: number;
    recentCollections: Array<{ id: string; clientName: string; amount: number; date: string }>;
}

export interface FirmMetrics {
    activeCases: number;
    googleReviewsWeekly: number;
    googleReviewsYTD: number;
    newCasesSignedWeekly: number;
    newCasesSignedYTD: number;
    clio: ClioCase[];
    ghl: GHLMetric;
    qb: QBMetric;
}
