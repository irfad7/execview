import { ClioCase, GHLMetric, QBMetric, FirmMetrics } from "./types";

const MOCK_CLIO_CASES: ClioCase[] = [
    {
        id: "1",
        name: "Estate of John Doe",
        clientName: "Jane Doe",
        caseNumber: "2023-PR-001",
        chargeType: "Flat Fee",
        type: "Felony",
        openDate: "2023-01-15",
        upcomingCourtDate: "2025-12-28",
        outstandingBalance: 2500,
        discoveryReceived: true,
        pleaOfferReceived: false,
    },
    {
        id: "2",
        name: "Smith vs. Global Corp",
        clientName: "Alice Smith",
        caseNumber: "2024-CV-102",
        chargeType: "Contingency",
        type: "Misdemeanor",
        openDate: "2024-03-10",
        upcomingCourtDate: "2026-01-05",
        outstandingBalance: 0,
        discoveryReceived: false,
        pleaOfferReceived: false,
    },
    {
        id: "3",
        name: "DUI Defense - Mike Ross",
        clientName: "Mike Ross",
        caseNumber: "2025-CR-445",
        chargeType: "Hourly",
        type: "DUI",
        openDate: "2025-11-20",
        upcomingCourtDate: "2025-12-24",
        outstandingBalance: 4500,
        discoveryReceived: true,
        pleaOfferReceived: true,
    },
    {
        id: "4",
        name: "Speeding Ticket - Sarah Jenkins",
        clientName: "Sarah Jenkins",
        caseNumber: "2025-TR-992",
        chargeType: "Flat Fee",
        type: "Traffic",
        openDate: "2025-12-01",
        outstandingBalance: 350,
        discoveryReceived: false,
        pleaOfferReceived: false,
    }
];

const MOCK_GHL_METRICS: GHLMetric = {
    leadsWeekly: 24,
    leadsYTD: 1150,
    consultsScheduled: 42,
    retainersSigned: 12,
    adSpend: 5000,
    feesCollected: 25000,
    consultationsWeekly: 12,
    conversionRate: 0.15,
    roi: 4.2,
    leadSources: {
        "Google LSA": 12,
        "Referrals": 6,
        "Website": 4,
        "Other": 2
    },
    opportunityFeed: [
        { id: "L1", contactName: "Robert Brown", date: "2025-12-23", timeOnPhone: "12m", pipelineStage: "Discovery", source: "Google LSA", owner: "Ivy" },
        { id: "L2", contactName: "Sarah Miller", date: "2025-12-23", timeOnPhone: "8m", pipelineStage: "Scheduled", source: "Website", owner: "Ivy" }
    ],
    avgTimeOnPhone: "14m"
};

const MOCK_QB_METRICS: QBMetric = {
    revenueYTD: 425000,
    closedCasesWeekly: 3,
    avgCaseValue: 12500,
    paymentsCollectedWeekly: 18500,
    recentCollections: [
        { id: "P1", clientName: "Estate of John Doe", amount: 2500, date: "2025-12-22" },
        { id: "P2", clientName: "Mike Ross", amount: 4500, date: "2025-12-21" }
    ]
};

const MOCK_FIRM_METRICS: FirmMetrics = {
    activeCases: 42,
    googleReviewsWeekly: 3,
    googleReviewsYTD: 156,
    newCasesSignedWeekly: 2,
    newCasesSignedYTD: 86,
    clio: MOCK_CLIO_CASES,
    ghl: MOCK_GHL_METRICS,
    qb: MOCK_QB_METRICS
};

export async function getMockData(): Promise<FirmMetrics> {
    await new Promise(resolve => setTimeout(resolve, 800));
    return MOCK_FIRM_METRICS;
}
