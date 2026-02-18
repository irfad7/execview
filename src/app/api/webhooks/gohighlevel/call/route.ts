import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * POST /api/webhooks/gohighlevel/call
 *
 * Receives call completion data from a GHL workflow.
 *
 * GHL sends "Custom Data" key-value pairs either:
 *   a) Flat in the body: { contactId, callDuration, callStatus, calledAt, ...standardGHLFields }
 *   b) Wrapped under a "customData" key: { customData: { contactId, ... }, ...standardGHLFields }
 *
 * We handle both formats. locationId is not required — single-firm setup.
 */

/** Parse call duration to seconds. GHL may send:
 *  - Number:  245
 *  - String seconds: "245"
 *  - String m:s: "4:05"
 */
function parseDurationToSeconds(raw: string | number | undefined): number {
    if (!raw) return 0;
    if (typeof raw === 'number') return Math.round(raw);
    const str = String(raw).trim();
    if (str.includes(':')) {
        const [mins, secs] = str.split(':').map(Number);
        return (mins || 0) * 60 + (secs || 0);
    }
    return parseInt(str, 10) || 0;
}

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        console.log("Call webhook raw payload:", rawBody.slice(0, 500));

        let body: any;
        try {
            body = JSON.parse(rawBody);
        } catch {
            return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
        }

        // GHL may nest custom data under "customData" or send it flat at the top level
        const data = body.customData || body;

        const contactId: string | undefined =
            data.contactId || body.contact_id || body.id;

        const callDuration = data.callDuration ?? data.call_duration;
        const callStatus: string = data.callStatus || data.call_status || 'completed';
        const calledAt: string = data.calledAt || data.called_at || new Date().toISOString();

        if (!contactId) {
            console.error("Call webhook: missing contactId. Full payload:", rawBody.slice(0, 300));
            return NextResponse.json({ error: "Missing contactId" }, { status: 400 });
        }

        const durationSeconds = parseDurationToSeconds(callDuration);
        console.log(`Call webhook: contactId=${contactId}, duration=${durationSeconds}s, status=${callStatus}`);

        // Single-firm setup — find the one active GHL (execview) config
        const apiConfig = await prisma.apiConfig.findFirst({
            where: { service: "execview", isActive: true }
        });

        if (!apiConfig) {
            console.error("Call webhook: no active GHL integration found");
            return NextResponse.json({ error: "Integration not found" }, { status: 404 });
        }

        const userId = apiConfig.userId;

        // Resolve target opportunity: most recent active opp for this contact
        const recentOpp = await prisma.gHLOpportunity.findFirst({
            where: { contactId, userId, isActive: true },
            orderBy: { dateCreated: 'desc' }
        });

        if (recentOpp) {
            const existingCf = recentOpp.customFields
                ? (() => { try { return JSON.parse(recentOpp.customFields!); } catch { return {}; } })()
                : {};

            await prisma.gHLOpportunity.update({
                where: { id: recentOpp.id },
                data: {
                    customFields: JSON.stringify({
                        ...existingCf,
                        callDurationSeconds: durationSeconds,
                        callStatus,
                        lastCallAt: calledAt
                    }),
                    updatedAt: new Date()
                }
            });

            console.log(`Call webhook: stored ${durationSeconds}s on opportunity ${recentOpp.opportunityId}`);
        } else {
            console.warn(`Call webhook: no opportunity found for contactId=${contactId}`);
        }

        // Invalidate dashboard cache
        await prisma.dashboardCache.deleteMany({ where: { userId } });

        return NextResponse.json({
            status: "ok",
            contactId,
            opportunityUpdated: !!recentOpp,
            durationSeconds
        });

    } catch (error) {
        console.error("Call webhook error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
