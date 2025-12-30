"use server";

import db, { initDb } from "./db";
import { FirmMetrics } from "./types";

export async function ensureDb() {
    initDb();
}

export async function getSyncStatus() {
    return db.prepare("SELECT * FROM sync_status WHERE id = 1").get();
}

export async function updateSyncStatus(status: string, errorMessage?: string) {
    db.prepare("UPDATE sync_status SET status = ?, last_updated = CURRENT_TIMESTAMP, error_message = ? WHERE id = 1")
        .run(status, errorMessage || null);
}

import { ClioConnector } from "@/integrations/clio/client";
import { QuickBooksConnector } from "@/integrations/quickbooks/client";
import { GoHighLevelConnector } from "@/integrations/gohighlevel/client";

// ... existing code ...

export async function refreshDashboardData() {
    console.log("Starting dashboard refresh...");

    // Initialize connectors
    const clio = new ClioConnector();
    const qb = new QuickBooksConnector();
    const ghl = new GoHighLevelConnector();

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
            // metrics.googleReviewsWeekly = ghlRes.data.googleReviews || 0; // if available
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

// Replaces getMockData
export async function getLiveDashboardData(): Promise<FirmMetrics | null> {
    const row = db.prepare("SELECT data FROM dashboard_cache WHERE id = 1").get() as { data: string } | undefined;
    if (!row) return null;
    try {
        return JSON.parse(row.data) as FirmMetrics;
    } catch (e) {
        console.error("Failed to parse dashboard cache", e);
        return null;
    }
}

export async function getCachedData() {
    return getLiveDashboardData();
}

export async function setCachedData(data: any) {
    db.prepare("INSERT OR REPLACE INTO dashboard_cache (id, data, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP)")
        .run(JSON.stringify(data));
}

export async function saveFieldMapping(service: string, dashboardField: string, sourceField: string) {
    const id = `${service}_${dashboardField}`;
    db.prepare("INSERT OR REPLACE INTO field_mappings (id, service, dashboard_field, source_field) VALUES (?, ?, ?, ?)")
        .run(id, service, dashboardField, sourceField);
}

export async function getFieldMappings(service: string) {
    return db.prepare("SELECT * FROM field_mappings WHERE service = ?").all(service) as any[];
}

export async function getApiConfigs() {
    return db.prepare("SELECT service, access_token, updated_at FROM api_configs").all() as any[];
}

export async function disconnectService(service: string) {
    db.prepare("UPDATE api_configs SET access_token = NULL, refresh_token = NULL, expires_at = NULL WHERE service = ?")
        .run(service);
}

export async function getProfile() {
    return db.prepare("SELECT * FROM profile WHERE id = 1").get() as any;
}

export async function updateProfile(data: { name: string, firm_name: string, email: string, phone: string }) {
    db.prepare("UPDATE profile SET name = ?, firm_name = ?, email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1")
        .run(data.name, data.firm_name, data.email, data.phone);
}

export async function addLog(service: string, level: string, message: string, details?: string) {
    db.prepare("INSERT INTO logs (service, level, message, details) VALUES (?, ?, ?, ?)")
        .run(service, level, message, details || null);
}

export async function getLogs(limit: number = 50) {
    return db.prepare("SELECT * FROM logs ORDER BY created_at DESC LIMIT ?").all(limit) as any[];
}

export async function getSystemSetting(key: string) {
    const row = db.prepare("SELECT value FROM system_settings WHERE key = ?").get(key) as any;
    return row ? JSON.parse(row.value) : null;
}

export async function updateSystemSetting(key: string, value: any) {
    db.prepare("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)")
        .run(key, JSON.stringify(value));
}
