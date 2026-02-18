"use server";

import prisma from "./prisma";
import { AuthService } from "./auth";
import { FirmMetrics } from "./types";
import { cookies } from "next/headers";
import { getValidAccessToken, getValidAccessTokenWithRealm, refreshAllExpiringTokens } from "./tokenRefresh";

// Helper to get current authenticated user
async function getUser() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;
        
        if (!token) return null;
        
        const user = await AuthService.validateSession(token);
        return user;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

export async function ensureDb() {
    // Prisma handles schema management automatically
    console.log('Database connection ready');
}

export async function getSyncStatus() {
    const user = await getUser();
    if (!user) return null;
    
    return prisma.syncStatus.findUnique({ 
        where: { 
            userId_service: { 
                userId: user.id, 
                service: 'general' 
            } 
        } 
    });
}

export async function updateSyncStatus(status: string, errorMessage?: string) {
    const user = await getUser();
    if (!user) return;

    await prisma.syncStatus.upsert({
        where: { 
            userId_service: { 
                userId: user.id, 
                service: 'general' 
            } 
        },
        update: { status, errorMessage, lastUpdated: new Date() },
        create: { 
            userId: user.id, 
            service: 'general',
            status, 
            errorMessage, 
            lastUpdated: new Date() 
        }
    });
}

import { ClioConnector } from "@/integrations/clio/client";
import { QuickBooksConnector } from "@/integrations/quickbooks/client";
import { GoHighLevelConnector } from "@/integrations/gohighlevel/client";

export async function refreshDashboardData() {
    const user = await getUser();
    if (!user) throw new Error("Unauthorized");

    console.log("Starting dashboard refresh for user:", user.email);

    // First, refresh any expiring tokens proactively
    console.log("Checking and refreshing tokens if needed...");
    const tokenRefreshResults = await refreshAllExpiringTokens(user.id);
    console.log("Token refresh results:", JSON.stringify(tokenRefreshResults, null, 2));

    // Get valid tokens with automatic refresh
    // IMPORTANT: QuickBooks tokens only last 1 hour, so always get fresh tokens
    const clioToken = await getValidAccessToken('clio', user.id);
    const qbToken = await getValidAccessTokenWithRealm('quickbooks', user.id);
    const ghlToken = await getValidAccessTokenWithRealm('execview', user.id);

    // Log detailed token status for debugging
    console.log("=== TOKEN STATUS ===");
    console.log("Clio:", clioToken.success ? `Valid (refreshed: ${clioToken.refreshed})` : `FAILED: ${clioToken.error}`);
    console.log("QuickBooks:", qbToken.success ? `Valid (refreshed: ${qbToken.refreshed}, realmId: ${qbToken.realmId})` : `FAILED: ${qbToken.error}`);
    console.log("GoHighLevel:", ghlToken.success ? `Valid (refreshed: ${ghlToken.refreshed}, locationId: ${ghlToken.realmId})` : `FAILED: ${ghlToken.error}`);


    // Initialize connectors with validated/refreshed tokens
    const clio = new ClioConnector(clioToken.success ? clioToken.accessToken : null);
    const qb = new QuickBooksConnector(
        qbToken.success ? qbToken.accessToken : null,
        qbToken.realmId
    );
    const ghl = new GoHighLevelConnector(
        ghlToken.success ? ghlToken.accessToken : null,
        ghlToken.realmId
    );

    const metrics: any = {
        clio: [],
        ghl: {
            leadsWeekly: 0,
            leadsYTD: 0,
            consultsScheduled: 0,
            retainersSigned: 0,
            adSpend: 0,
            feesCollected: 0,
            consultationsWeekly: 0,
            conversionRate: 0,
            roi: 0,
            leadSources: [],
            opportunityFeed: [],
            avgTimeOnPhone: "0m"
        },
        qb: {
            revenueYTD: 0,
            adSpendYTD: 0,
            closedCasesWeekly: 0,
            avgCaseValue: 0,
            paymentsCollectedWeekly: 0,
            recentCollections: [],
            transactions: []
        },
        // Default fallbacks
        activeCases: 0,
        googleReviewsWeekly: 0,
        newCasesSignedWeekly: 0,
        newCasesSignedYTD: 0
    };

    // 1. Fetch Clio
    try {
        if (!clioToken.success) {
            const errorMsg = `Token error: ${clioToken.error}`;
            console.error("Clio: Skipping fetch - no valid token:", clioToken.error);
            metrics.syncErrors = metrics.syncErrors || {};
            metrics.syncErrors.clio = errorMsg;
            await addLog('clio', 'error', 'Token validation failed', clioToken.error);
        } else {
            console.log("Clio: Fetching metrics with valid token...");
            const clioRes = await clio.fetchMetrics();
            console.log("Clio: Response status:", clioRes.status, "- matters count:", clioRes.data?.matters?.length || 0);

            if (clioRes.status === "success") {
                // Store core case data
                metrics.clio = clioRes.data.matters || [];
                metrics.activeCases = clioRes.data.activeCases || 0;

                // Store case management data for dashboard
                metrics.clioData = {
                    caseManagement: clioRes.data.caseManagement || {},
                    upcomingCourtDates: clioRes.data.upcomingCourtDates || [],
                    bookkeeping: clioRes.data.bookkeeping || {}
                };

                // Update dashboard metrics with Clio data
                if (clioRes.data.bookkeeping) {
                    metrics.weeklyClosedCases = clioRes.data.bookkeeping.casesClosedThisWeek || 0;
                    metrics.paymentsCollectedWeekly = clioRes.data.bookkeeping.paymentsCollectedThisWeek || 0;
                    metrics.avgCaseValue = clioRes.data.bookkeeping.averageCaseValueYTD || 0;
                }
                console.log("Clio: Successfully fetched", metrics.clio.length, "cases");

                // Log warning if no cases found
                if (metrics.clio.length === 0) {
                    console.warn("Clio: No open cases found - this may be expected if all cases are closed");
                    await addLog('clio', 'warning', 'No open cases found', 'API returned 0 open matters');
                }
            } else {
                console.error("Clio: API returned non-success status");
                metrics.syncErrors = metrics.syncErrors || {};
                metrics.syncErrors.clio = "API returned non-success status";
            }
        }
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error("Clio sync failed:", errorMsg);
        metrics.syncErrors = metrics.syncErrors || {};
        metrics.syncErrors.clio = errorMsg;
        await addLog('clio', 'error', 'Sync failed', errorMsg);
    }

    // 2. Fetch GHL - Use direct API call (more reliable than database-based enhanced service)
    try {
        if (!ghlToken.success) {
            const errorMsg = `Token error: ${ghlToken.error}`;
            console.error("GHL: Skipping fetch - no valid token:", ghlToken.error);
            metrics.syncErrors = metrics.syncErrors || {};
            metrics.syncErrors.ghl = errorMsg;
            await addLog('gohighlevel', 'error', 'Token validation failed', ghlToken.error);
        } else if (!ghlToken.realmId) {
            const errorMsg = "Missing locationId - please reconnect GoHighLevel";
            console.error("GHL: Missing locationId");
            metrics.syncErrors = metrics.syncErrors || {};
            metrics.syncErrors.ghl = errorMsg;
            await addLog('gohighlevel', 'error', 'Missing locationId', errorMsg);
        } else {
            console.log("GHL: Fetching metrics directly from API...");
            const ghlRes = await ghl.fetchMetrics();
            if (ghlRes.status === "success") {
                metrics.ghl = ghlRes.data;
                metrics.newCasesSignedWeekly = ghlRes.data.retainersSigned || 0;
                console.log("GHL: Successfully fetched", ghlRes.data.totalOpportunities, "opportunities,", ghlRes.data.totalContacts, "contacts");
            } else {
                console.warn("GHL direct fetch returned non-success status");
                metrics.syncErrors = metrics.syncErrors || {};
                metrics.syncErrors.ghl = "API returned non-success status";
            }
        }
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error("GHL sync failed:", errorMsg);
        metrics.syncErrors = metrics.syncErrors || {};
        metrics.syncErrors.ghl = errorMsg;
        await addLog('gohighlevel', 'error', 'Sync failed', errorMsg);
    }

    // 3. Fetch QuickBooks
    try {
        if (!qbToken.success) {
            const errorMsg = `Token error: ${qbToken.error}`;
            console.error("QB: Skipping fetch - no valid token:", qbToken.error);
            metrics.syncErrors = metrics.syncErrors || {};
            metrics.syncErrors.quickbooks = errorMsg;
            await addLog('quickbooks', 'error', 'Token validation failed', qbToken.error);
        } else if (!qbToken.realmId) {
            const errorMsg = "Missing realmId (company ID) - please reconnect QuickBooks";
            console.error("QB: Missing realmId");
            metrics.syncErrors = metrics.syncErrors || {};
            metrics.syncErrors.quickbooks = errorMsg;
            await addLog('quickbooks', 'error', 'Missing realmId', errorMsg);
        } else {
            console.log("QB: Fetching metrics with valid token...");
            const qbRes = await qb.fetchMetrics();
            if (qbRes.status === "success") {
                metrics.qb = qbRes.data;
                console.log("QB: Successfully fetched - Revenue YTD:", qbRes.data.revenueYTD, ", Transactions:", qbRes.data.transactions?.length || 0);

                // Log warning if no financial data found
                if (qbRes.data.revenueYTD === 0 && (!qbRes.data.transactions || qbRes.data.transactions.length === 0)) {
                    console.warn("QB: No financial data found - company may have no invoices/payments yet");
                    await addLog('quickbooks', 'warning', 'No financial data', 'Revenue and payments are $0');
                }
            } else {
                console.warn("QB: API returned non-success status");
                metrics.syncErrors = metrics.syncErrors || {};
                metrics.syncErrors.quickbooks = "API returned non-success status";
            }
        }
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error("QB sync failed:", errorMsg);
        metrics.syncErrors = metrics.syncErrors || {};
        metrics.syncErrors.quickbooks = errorMsg;
        await addLog('quickbooks', 'error', 'Sync failed', errorMsg);
    }

    // Update Cache
    await setCachedData(metrics);
    await updateSyncStatus("success");

    return metrics;
}

export async function getLiveDashboardData(): Promise<FirmMetrics | null> {
    const user = await getUser();
    if (!user) return null;

    const cache = await prisma.dashboardCache.findUnique({
        where: { 
            userId_cacheKey: { 
                userId: user.id, 
                cacheKey: 'dashboard_metrics' 
            } 
        }
    });

    if (!cache) return null;
    try {
        return JSON.parse(cache.cacheData) as FirmMetrics;
    } catch (e) {
        console.error("Failed to parse dashboard cache", e);
        return null;
    }
}

export async function getCachedData() {
    return getLiveDashboardData();
}

export async function setCachedData(data: any) {
    const user = await getUser();
    if (!user) return;

    await prisma.dashboardCache.upsert({
        where: { 
            userId_cacheKey: { 
                userId: user.id, 
                cacheKey: 'dashboard_metrics' 
            } 
        },
        update: { 
            cacheData: JSON.stringify(data), 
            updatedAt: new Date() 
        },
        create: { 
            userId: user.id, 
            cacheKey: 'dashboard_metrics',
            cacheData: JSON.stringify(data) 
        }
    });
}

export async function saveFieldMapping(service: string, category: string, mappings: any) {
    const user = await getUser();
    if (!user) return;

    await prisma.fieldMapping.upsert({
        where: {
            service_category_userId: {
                service,
                category,
                userId: user.id
            }
        },
        update: { mappings: JSON.stringify(mappings) },
        create: { 
            service, 
            category, 
            mappings: JSON.stringify(mappings), 
            userId: user.id 
        }
    });
}

export async function getFieldMappings(service: string) {
    const user = await getUser();
    if (!user) return [];
    
    return prisma.fieldMapping.findMany({
        where: { service, userId: user.id }
    });
}

export async function getApiConfigs() {
    const user = await getUser();
    if (!user) return [];

    // Let's lazy-init the rows if they don't exist
    for (const service of ['clio', 'execview', 'quickbooks']) {
        const exists = await prisma.apiConfig.findUnique({
            where: { service_userId: { service, userId: user.id } }
        });
        if (!exists) {
            await prisma.apiConfig.create({
                data: { service, userId: user.id }
            });
        }
    }

    return prisma.apiConfig.findMany({
        where: { userId: user.id },
        select: { service: true, accessToken: true, realmId: true, updatedAt: true }
    });
}

export async function disconnectService(service: string) {
    const user = await getUser();
    if (!user) return;

    await prisma.apiConfig.update({
        where: { service_userId: { service, userId: user.id } },
        data: { accessToken: null, refreshToken: null, expiresAt: null }
    });
}

export async function getProfile() {
    const user = await getUser();
    if (!user) return null;

    let profile = await prisma.profile.findUnique({ where: { userId: user.id } });
    if (!profile) {
        // Create default profile
        profile = await prisma.profile.create({
            data: {
                userId: user.id,
                email: user.email,
                name: 'New User',
                firmName: 'My Firm'
            }
        });
    }
    return profile;
}

export async function updateProfile(data: { name: string, firmName: string, email?: string, phone?: string }) {
    const user = await getUser();
    if (!user) return;

    await prisma.profile.update({
        where: { userId: user.id },
        data: {
            name: data.name,
            firmName: data.firmName,
            phone: data.phone
        }
    });
}

export async function addLog(service: string, level: string, message: string, details?: string) {
    const user = await getUser();
    if (!user) return;

    await prisma.log.create({
        data: {
            service,
            level,
            message,
            details,
            userId: user.id
        }
    });
}

export async function getLogs(limit: number = 50) {
    const user = await getUser();
    if (!user) return [];

    return prisma.log.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: limit
    });
}

export async function getSystemSetting(key: string) {
    const user = await getUser();
    if (!user) return null;

    const setting = await prisma.systemSettings.findUnique({
        where: { settingKey_userId: { settingKey: key, userId: user.id } }
    });
    return setting ? JSON.parse(setting.settingValue) : null;
}

export async function updateSystemSetting(key: string, value: any) {
    const user = await getUser();
    if (!user) return;

    await prisma.systemSettings.upsert({
        where: { settingKey_userId: { settingKey: key, userId: user.id } },
        update: { settingValue: JSON.stringify(value) },
        create: { settingKey: key, settingValue: JSON.stringify(value), userId: user.id }
    });
}
