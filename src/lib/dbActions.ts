"use server";

import prisma from "./prisma";
import { createClient } from "./supabase/server";
import { FirmMetrics } from "./types";

// Helper to get current authenticated user
async function getUser() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
}

export async function ensureDb() {
    // No-op for Prisma/Supabase as schema is managed via migrations
}

export async function getSyncStatus() {
    const user = await getUser();
    if (!user) return null;
    return prisma.syncStatus.findUnique({ where: { userId: user.id } });
}

export async function updateSyncStatus(status: string, errorMessage?: string) {
    const user = await getUser();
    if (!user) return;

    await prisma.syncStatus.upsert({
        where: { userId: user.id },
        update: { status, errorMessage, lastUpdated: new Date() },
        create: { userId: user.id, status, errorMessage, lastUpdated: new Date() }
    });
}

import { ClioConnector } from "@/integrations/clio/client";
import { QuickBooksConnector } from "@/integrations/quickbooks/client";
import { GoHighLevelConnector } from "@/integrations/gohighlevel/client";

export async function refreshDashboardData() {
    const user = await getUser();
    if (!user) throw new Error("Unauthorized");

    console.log("Starting dashboard refresh for user:", user.email);

    // Fetch User's API Configs
    const configs = await prisma.apiConfig.findMany({
        where: { userId: user.id }
    });

    const getToken = (service: string) => configs.find(c => c.service === service)?.accessToken;

    // Initialize connectors with tokens
    const clio = new ClioConnector(getToken('clio'));
    const qb = new QuickBooksConnector(getToken('quickbooks'));
    const ghl = new GoHighLevelConnector(getToken('execview'));

    const metrics: any = {
        clio: [],
        ghl: {},
        qb: {},
        // Default fallbacks
        activeCases: 0,
        googleReviewsWeekly: 0,
        newCasesSignedWeekly: 0,
        newCasesSignedYTD: 0
    };

    // 1. Fetch Clio
    try {
        const clioRes = await clio.fetchMetrics();
        if (clioRes.status === "success") {
            metrics.clio = clioRes.data.matters || [];
            metrics.activeCases = clioRes.data.activeCases || 0;
        }
    } catch (e) {
        console.error("Clio sync failed:", e);
    }

    // 2. Fetch GHL
    try {
        const ghlRes = await ghl.fetchMetrics();
        if (ghlRes.status === "success") {
            metrics.ghl = ghlRes.data;
            metrics.newCasesSignedWeekly = ghlRes.data.retainersSigned || 0;
        }
    } catch (e) {
        console.error("GHL sync failed:", e);
    }

    // 3. Fetch QuickBooks
    try {
        const qbRes = await qb.fetchMetrics();
        if (qbRes.status === "success") {
            metrics.qb = qbRes.data;
        }
    } catch (e) {
        console.error("QB sync failed:", e);
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
        where: { userId: user.id }
    });

    if (!cache) return null;
    try {
        return JSON.parse(cache.data) as FirmMetrics;
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
        where: { userId: user.id },
        update: { data: JSON.stringify(data), updatedAt: new Date() },
        create: { userId: user.id, data: JSON.stringify(data) }
    });
}

export async function saveFieldMapping(service: string, dashboardField: string, sourceField: string) {
    const user = await getUser();
    if (!user) return;

    await prisma.fieldMapping.upsert({
        where: {
            service_dashboardField_userId: {
                service,
                dashboardField,
                userId: user.id
            }
        },
        update: { sourceField },
        create: { service, dashboardField, sourceField, userId: user.id }
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

    // Ensure default configs exist for the user (similar to initDb logic)
    const services = ['clio', 'execview', 'quickbooks'];
    for (const service of services) {
        // We only create if not exists, but we need to return all
        // It's better to upsert or just query and fill gaps.
        // For simplicity, let's just query. If empty, maybe UI handles it or we seed on signup.
        // Actually, let's seed on demand if missing logic is preferred,
        // but UI expects a list. 
    }

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
        select: { service: true, accessToken: true, updatedAt: true }
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

    let profile = await prisma.profile.findUnique({ where: { id: user.id } });
    if (!profile) {
        // Create default profile
        profile = await prisma.profile.create({
            data: {
                id: user.id,
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
        where: { id: user.id },
        data: {
            name: data.name,
            firmName: data.firmName, // Note: Prisma model uses camelCase firmName mapping to firm_name
            phone: data.phone
        }
    });
}

export async function addLog(service: string, level: string, message: string, details?: string) {
    const user = await getUser();
    if (!user) return; // Logs require user context or global log table? Let's assume user context.

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

    const setting = await prisma.systemSetting.findUnique({
        where: { key_userId: { key, userId: user.id } }
    });
    return setting ? JSON.parse(setting.value) : null;
}

export async function updateSystemSetting(key: string, value: any) {
    const user = await getUser();
    if (!user) return;

    await prisma.systemSetting.upsert({
        where: { key_userId: { key, userId: user.id } },
        update: { value: JSON.stringify(value) },
        create: { key, value: JSON.stringify(value), userId: user.id }
    });
}
