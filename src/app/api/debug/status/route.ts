"use server";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { AuthService } from "@/lib/auth";

export async function GET() {
    try {
        // Get current user
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;

        if (!token) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const user = await AuthService.validateSession(token);
        if (!user) {
            return NextResponse.json({ error: "Invalid session" }, { status: 401 });
        }

        // Get all API configs
        const apiConfigs = await prisma.apiConfig.findMany({
            where: { userId: user.id },
            select: {
                service: true,
                accessToken: true,
                refreshToken: true,
                realmId: true,
                expiresAt: true,
                updatedAt: true,
                isActive: true
            }
        });

        // Get dashboard cache
        const cache = await prisma.dashboardCache.findUnique({
            where: {
                userId_cacheKey: {
                    userId: user.id,
                    cacheKey: 'dashboard_metrics'
                }
            }
        });

        // Get sync status
        const syncStatuses = await prisma.syncStatus.findMany({
            where: { userId: user.id }
        });

        // Get GHL data counts
        const ghlCounts = {
            contacts: await prisma.gHLContact.count({ where: { userId: user.id } }),
            opportunities: await prisma.gHLOpportunity.count({ where: { userId: user.id } }),
            pipelines: await prisma.gHLPipeline.count({ where: { userId: user.id } }),
            locations: await prisma.gHLLocation.count({ where: { userId: user.id } })
        };

        // Format configs for display (mask tokens)
        const configsSummary = apiConfigs.map(c => ({
            service: c.service,
            hasAccessToken: !!c.accessToken,
            hasRefreshToken: !!c.refreshToken,
            realmId: c.realmId,
            expiresAt: c.expiresAt,
            updatedAt: c.updatedAt,
            isActive: c.isActive,
            tokenPreview: c.accessToken ? c.accessToken.substring(0, 20) + '...' : null
        }));

        // Parse cache data
        let cacheData = null;
        if (cache) {
            try {
                cacheData = JSON.parse(cache.cacheData);
            } catch (e) {
                cacheData = { error: "Failed to parse cache" };
            }
        }

        return NextResponse.json({
            user: { id: user.id, email: user.email },
            apiConfigs: configsSummary,
            ghlDatabaseCounts: ghlCounts,
            syncStatuses,
            cache: {
                exists: !!cache,
                updatedAt: cache?.updatedAt,
                ghlSummary: cacheData ? {
                    leadsWeekly: cacheData.ghl?.leadsWeekly,
                    leadsYTD: cacheData.ghl?.leadsYTD,
                    opportunitiesWeekly: cacheData.ghl?.opportunitiesWeekly,
                    totalOpportunities: cacheData.ghl?.totalOpportunities,
                    totalContacts: cacheData.ghl?.totalContacts,
                    opportunityFeedCount: cacheData.ghl?.opportunityFeed?.length
                } : null,
                clioSummary: cacheData ? {
                    activeCases: cacheData.activeCases,
                    clioArrayLength: cacheData.clio?.length,
                    hasClioData: !!cacheData.clioData
                } : null,
                qbSummary: cacheData ? {
                    revenueYTD: cacheData.qb?.revenueYTD,
                    paymentsCollectedWeekly: cacheData.qb?.paymentsCollectedWeekly
                } : null
            }
        });

    } catch (error) {
        console.error("Debug status error:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
