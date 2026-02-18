import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * POST /api/webhooks/gohighlevel/call
 *
 * Receives call completion data from a GHL workflow.
 * Set up a GHL workflow with trigger: "Call Status → Completed"
 * and action: "Send HTTP Request" → POST to this URL.
 *
 * Expected payload:
 * {
 *   "locationId": "{{location.id}}",
 *   "contactId":  "{{contact.id}}",
 *   "callDuration": {{call.duration}},   // seconds (integer)
 *   "callStatus":   "{{call.status}}",   // "completed" | "missed" | "voicemail"
 *   "calledAt":     "{{now}}"            // ISO timestamp
 * }
 *
 * Optional (include if the workflow has opportunity context):
 *   "opportunityId": "{{opportunity.id}}"
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { locationId, contactId, opportunityId, callDuration, callStatus, calledAt } = body;

        if (!locationId || !contactId) {
            return NextResponse.json(
                { error: "Missing required fields: locationId and contactId" },
                { status: 400 }
            );
        }

        // Find the user associated with this location
        const apiConfig = await prisma.apiConfig.findFirst({
            where: { service: "execview", realmId: locationId, isActive: true }
        });

        if (!apiConfig) {
            console.error(`Call webhook: no active GHL integration for locationId: ${locationId}`);
            return NextResponse.json({ error: "Integration not found" }, { status: 404 });
        }

        const userId = apiConfig.userId;
        const durationSeconds = typeof callDuration === 'number' ? callDuration : parseInt(callDuration || '0', 10);

        // Resolve target opportunity: direct ID → most recent open opp for contact
        let targetOpportunityId: string | null = opportunityId || null;

        if (!targetOpportunityId && contactId) {
            const recentOpp = await prisma.gHLOpportunity.findFirst({
                where: { contactId, userId, isActive: true },
                orderBy: { dateCreated: 'desc' }
            });
            targetOpportunityId = recentOpp?.opportunityId || null;
        }

        if (targetOpportunityId) {
            // Merge call data into opportunity's customFields
            const existing = await prisma.gHLOpportunity.findFirst({
                where: { opportunityId: targetOpportunityId, userId }
            });

            const existingCustomFields = existing?.customFields
                ? JSON.parse(existing.customFields)
                : {};

            const updatedCustomFields = {
                ...existingCustomFields,
                callDurationSeconds: durationSeconds,
                callStatus: callStatus || 'completed',
                lastCallAt: calledAt || new Date().toISOString()
            };

            await prisma.gHLOpportunity.updateMany({
                where: { opportunityId: targetOpportunityId, userId },
                data: { customFields: JSON.stringify(updatedCustomFields), updatedAt: new Date() }
            });

            console.log(`Call webhook: stored ${durationSeconds}s call on opportunity ${targetOpportunityId}`);
        } else {
            // No opportunity found — log against the contact instead (store in first matching opp when it arrives)
            console.warn(`Call webhook: no opportunity found for contact ${contactId}, duration=${durationSeconds}s`);
        }

        // Invalidate dashboard cache so next load reflects updated call times
        await prisma.dashboardCache.deleteMany({ where: { userId } });

        return NextResponse.json({
            status: "ok",
            opportunityUpdated: !!targetOpportunityId,
            durationSeconds
        });

    } catch (error) {
        console.error("Call webhook error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
