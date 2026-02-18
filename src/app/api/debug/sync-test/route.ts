"use server";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { AuthService } from "@/lib/auth";
import { getValidAccessToken, getValidAccessTokenWithRealm } from "@/lib/tokenRefresh";
import { ClioConnector } from "@/integrations/clio/client";
import { QuickBooksConnector } from "@/integrations/quickbooks/client";
import { GoHighLevelConnector } from "@/integrations/gohighlevel/client";

/**
 * Comprehensive sync test endpoint
 * This endpoint tests each integration step-by-step and returns detailed results
 * Use this to debug why data isn't syncing properly
 */
export async function GET() {
    const results: any = {
        timestamp: new Date().toISOString(),
        steps: [],
        errors: [],
        summary: {}
    };

    const addStep = (step: string, status: 'success' | 'error' | 'warning', details: any) => {
        results.steps.push({ step, status, details, time: new Date().toISOString() });
        if (status === 'error') {
            results.errors.push({ step, details });
        }
    };

    try {
        // Step 1: Authentication
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;

        if (!token) {
            addStep('Authentication', 'error', 'No session cookie found');
            return NextResponse.json(results, { status: 401 });
        }

        const user = await AuthService.validateSession(token);
        if (!user) {
            addStep('Authentication', 'error', 'Invalid session');
            return NextResponse.json(results, { status: 401 });
        }

        addStep('Authentication', 'success', { userId: user.id, email: user.email });

        // Step 2: Get all API configs
        const apiConfigs = await prisma.apiConfig.findMany({
            where: { userId: user.id }
        });

        addStep('API Configs', 'success', {
            count: apiConfigs.length,
            services: apiConfigs.map(c => ({
                service: c.service,
                hasToken: !!c.accessToken,
                hasRefresh: !!c.refreshToken,
                realmId: c.realmId,
                expiresAt: c.expiresAt ? new Date(c.expiresAt * 1000).toISOString() : null,
                isExpired: c.expiresAt ? (c.expiresAt * 1000) < Date.now() : 'no expiry'
            }))
        });

        // Step 3: Test Clio
        const clioToken = await getValidAccessToken('clio', user.id);
        if (!clioToken.success) {
            addStep('Clio Token', 'error', clioToken.error);
        } else {
            addStep('Clio Token', 'success', { refreshed: clioToken.refreshed });

            try {
                const clio = new ClioConnector(clioToken.accessToken);
                const clioMetrics = await clio.fetchMetrics();

                if (clioMetrics.status === 'success') {
                    addStep('Clio API', 'success', {
                        activeCases: clioMetrics.data.activeCases,
                        mattersCount: clioMetrics.data.matters?.length || 0,
                        upcomingCourtDates: clioMetrics.data.upcomingCourtDates?.length || 0,
                        sample: clioMetrics.data.matters?.slice(0, 2).map((m: any) => ({
                            name: m.name,
                            clientName: m.clientName,
                            status: m.status
                        }))
                    });
                    results.summary.clio = {
                        status: 'success',
                        cases: clioMetrics.data.activeCases
                    };
                } else {
                    addStep('Clio API', 'error', 'API returned non-success');
                }
            } catch (e) {
                addStep('Clio API', 'error', e instanceof Error ? e.message : String(e));
            }
        }

        // Step 4: Test QuickBooks
        const qbToken = await getValidAccessTokenWithRealm('quickbooks', user.id);
        if (!qbToken.success) {
            addStep('QuickBooks Token', 'error', qbToken.error);
        } else if (!qbToken.realmId) {
            addStep('QuickBooks Token', 'error', 'Missing realmId (company ID)');
        } else {
            addStep('QuickBooks Token', 'success', { refreshed: qbToken.refreshed, realmId: qbToken.realmId });

            try {
                const qb = new QuickBooksConnector(qbToken.accessToken, qbToken.realmId);
                const qbMetrics = await qb.fetchMetrics();

                if (qbMetrics.status === 'success') {
                    addStep('QuickBooks API', 'success', {
                        revenueYTD: qbMetrics.data.revenueYTD,
                        paymentsWeekly: qbMetrics.data.paymentsCollectedWeekly,
                        avgCaseValue: qbMetrics.data.avgCaseValue,
                        recentCollectionsCount: qbMetrics.data.recentCollections?.length || 0
                    });
                    results.summary.quickbooks = {
                        status: 'success',
                        revenueYTD: qbMetrics.data.revenueYTD
                    };
                } else {
                    addStep('QuickBooks API', 'error', 'API returned non-success');
                }
            } catch (e) {
                addStep('QuickBooks API', 'error', e instanceof Error ? e.message : String(e));
            }
        }

        // Step 5: Test GoHighLevel
        const ghlToken = await getValidAccessTokenWithRealm('execview', user.id);
        if (!ghlToken.success) {
            addStep('GoHighLevel Token', 'error', ghlToken.error);
        } else if (!ghlToken.realmId) {
            addStep('GoHighLevel Token', 'error', 'Missing locationId');
        } else {
            addStep('GoHighLevel Token', 'success', { refreshed: ghlToken.refreshed, locationId: ghlToken.realmId });

            try {
                const ghl = new GoHighLevelConnector(ghlToken.accessToken, ghlToken.realmId);
                const ghlMetrics = await ghl.fetchMetrics();

                if (ghlMetrics.status === 'success') {
                    addStep('GoHighLevel API', 'success', {
                        totalContacts: ghlMetrics.data.totalContacts,
                        totalOpportunities: ghlMetrics.data.totalOpportunities,
                        leadsWeekly: ghlMetrics.data.leadsWeekly,
                        retainersSigned: ghlMetrics.data.retainersSigned
                    });
                    results.summary.gohighlevel = {
                        status: 'success',
                        contacts: ghlMetrics.data.totalContacts,
                        opportunities: ghlMetrics.data.totalOpportunities
                    };
                } else {
                    addStep('GoHighLevel API', 'error', 'API returned non-success');
                }
            } catch (e) {
                addStep('GoHighLevel API', 'error', e instanceof Error ? e.message : String(e));
            }
        }

        // Final summary
        results.summary.totalErrors = results.errors.length;
        results.summary.successfulIntegrations = Object.values(results.summary).filter((s: any) => s?.status === 'success').length;

        return NextResponse.json(results);

    } catch (error) {
        addStep('Fatal Error', 'error', error instanceof Error ? error.message : String(error));
        return NextResponse.json(results, { status: 500 });
    }
}
