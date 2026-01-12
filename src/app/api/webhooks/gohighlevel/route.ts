import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { EnhancedGoHighLevelConnector } from "@/integrations/gohighlevel/enhanced-client";
import { headers } from "next/headers";

const prisma = new PrismaClient();

// GHL webhook event types we handle
const SUPPORTED_EVENTS = [
    'ContactCreate',
    'ContactUpdate',
    'ContactDelete',
    'OpportunityCreate',
    'OpportunityUpdate',
    'OpportunityDelete',
    'OpportunityStatusUpdate'
];

export async function POST(request: NextRequest) {
    try {
        // Get the raw body for signature verification
        const body = await request.text();
        const headersList = await headers();
        
        // GHL webhook signature verification (if implemented by GHL)
        const signature = headersList.get('x-ghl-signature');
        const eventType = headersList.get('x-ghl-event-type');
        
        console.log(`Received GHL webhook: ${eventType}`, {
            signature: signature ? 'present' : 'missing',
            bodyLength: body.length
        });

        // Parse the webhook payload
        let payload;
        try {
            payload = JSON.parse(body);
        } catch (error) {
            console.error("Invalid JSON in webhook payload:", error);
            return NextResponse.json(
                { error: "Invalid JSON payload" },
                { status: 400 }
            );
        }

        // Validate required fields
        if (!payload.locationId) {
            console.error("Missing locationId in webhook payload");
            return NextResponse.json(
                { error: "Missing locationId" },
                { status: 400 }
            );
        }

        // Check if this is a supported event type
        if (eventType && !SUPPORTED_EVENTS.includes(eventType)) {
            console.log(`Unsupported event type: ${eventType}, ignoring`);
            return NextResponse.json({ status: "ignored" });
        }

        // Find the user associated with this location
        const apiConfig = await prisma.apiConfig.findFirst({
            where: {
                service: "execview", // GHL service alias
                realmId: payload.locationId, // locationId stored in realmId field
                isActive: true
            }
        });

        if (!apiConfig) {
            console.error(`No active GHL integration found for locationId: ${payload.locationId}`);
            return NextResponse.json(
                { error: "Integration not found" },
                { status: 404 }
            );
        }

        // Store webhook for processing
        const webhookRecord = await prisma.gHLWebhook.create({
            data: {
                eventType: eventType || 'unknown',
                objectId: payload.id || payload.contactId || payload.opportunityId || 'unknown',
                locationId: payload.locationId,
                payload: body,
                processed: false,
                userId: apiConfig.userId
            }
        });

        console.log(`Stored webhook record: ${webhookRecord.id}`);

        // Process the webhook immediately (for real-time updates)
        try {
            await processWebhook(webhookRecord.id, apiConfig);
        } catch (error) {
            console.error(`Failed to process webhook ${webhookRecord.id}:`, error);
            
            // Update webhook record with error
            await prisma.gHLWebhook.update({
                where: { id: webhookRecord.id },
                data: {
                    errorMessage: error instanceof Error ? error.message : "Processing failed"
                }
            });
        }

        return NextResponse.json({ 
            status: "received", 
            webhookId: webhookRecord.id 
        });

    } catch (error) {
        console.error("Webhook processing error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// Process individual webhook
async function processWebhook(webhookId: string, apiConfig: any) {
    const webhook = await prisma.gHLWebhook.findUnique({
        where: { id: webhookId }
    });

    if (!webhook || webhook.processed) {
        return; // Already processed or not found
    }

    try {
        const payload = JSON.parse(webhook.payload);
        const connector = new EnhancedGoHighLevelConnector(
            apiConfig.accessToken,
            webhook.locationId
        );

        switch (webhook.eventType) {
            case 'ContactCreate':
            case 'ContactUpdate':
                await handleContactEvent(payload, connector, webhook.userId);
                break;

            case 'ContactDelete':
                await handleContactDelete(payload, webhook.userId);
                break;

            case 'OpportunityCreate':
            case 'OpportunityUpdate':
            case 'OpportunityStatusUpdate':
                await handleOpportunityEvent(payload, connector, webhook.userId);
                break;

            case 'OpportunityDelete':
                await handleOpportunityDelete(payload, webhook.userId);
                break;

            default:
                console.log(`Unhandled event type: ${webhook.eventType}`);
        }

        // Mark webhook as processed
        await prisma.gHLWebhook.update({
            where: { id: webhookId },
            data: {
                processed: true,
                processedAt: new Date()
            }
        });

        console.log(`Successfully processed webhook: ${webhookId}`);

    } catch (error) {
        console.error(`Failed to process webhook ${webhookId}:`, error);
        
        await prisma.gHLWebhook.update({
            where: { id: webhookId },
            data: {
                errorMessage: error instanceof Error ? error.message : "Processing failed"
            }
        });
        
        throw error;
    }
}

// Handle contact events (create/update)
async function handleContactEvent(payload: any, connector: EnhancedGoHighLevelConnector, userId: string) {
    try {
        // Fetch the latest contact data from GHL API
        const contacts = await connector.fetchContacts(1, 0);
        const contact = contacts.find(c => c.id === payload.id);
        
        if (!contact) {
            console.error(`Contact not found in API: ${payload.id}`);
            return;
        }

        // Upsert contact in database
        await prisma.gHLContact.upsert({
            where: {
                contactId_userId: {
                    contactId: contact.id,
                    userId: userId
                }
            },
            update: {
                firstName: contact.firstName,
                lastName: contact.lastName,
                email: contact.email,
                phone: contact.phone,
                source: contact.source,
                tags: JSON.stringify(contact.tags || []),
                customFields: JSON.stringify(contact.customFields || {}),
                lastActivity: contact.lastActivity ? new Date(contact.lastActivity) : null,
                updatedAt: new Date()
            },
            create: {
                contactId: contact.id,
                firstName: contact.firstName,
                lastName: contact.lastName,
                email: contact.email,
                phone: contact.phone,
                source: contact.source,
                tags: JSON.stringify(contact.tags || []),
                customFields: JSON.stringify(contact.customFields || {}),
                dateAdded: new Date(contact.dateAdded),
                lastActivity: contact.lastActivity ? new Date(contact.lastActivity) : null,
                locationId: contact.locationId,
                userId: userId
            }
        });

        console.log(`Updated contact: ${contact.id}`);
        
        // Invalidate dashboard cache
        await invalidateCache(userId, 'ghl_metrics');

    } catch (error) {
        console.error("Failed to handle contact event:", error);
        throw error;
    }
}

// Handle contact deletion
async function handleContactDelete(payload: any, userId: string) {
    try {
        // Soft delete the contact
        await prisma.gHLContact.updateMany({
            where: {
                contactId: payload.id,
                userId: userId
            },
            data: {
                isActive: false,
                updatedAt: new Date()
            }
        });

        console.log(`Soft deleted contact: ${payload.id}`);
        
        // Invalidate dashboard cache
        await invalidateCache(userId, 'ghl_metrics');

    } catch (error) {
        console.error("Failed to handle contact delete:", error);
        throw error;
    }
}

// Handle opportunity events (create/update)
async function handleOpportunityEvent(payload: any, connector: EnhancedGoHighLevelConnector, userId: string) {
    try {
        // Fetch the latest opportunity data from GHL API
        const opportunities = await connector.fetchOpportunities(1, 0);
        const opportunity = opportunities.find(o => o.id === payload.id);
        
        if (!opportunity) {
            console.error(`Opportunity not found in API: ${payload.id}`);
            return;
        }

        // Upsert opportunity in database
        await prisma.gHLOpportunity.upsert({
            where: {
                opportunityId_userId: {
                    opportunityId: opportunity.id,
                    userId: userId
                }
            },
            update: {
                name: opportunity.name,
                status: opportunity.status,
                pipelineId: opportunity.pipelineId,
                pipelineStageId: opportunity.pipelineStageId,
                pipelineStageName: opportunity.pipelineStageName,
                monetaryValue: opportunity.monetaryValue || 0,
                source: opportunity.source,
                assignedTo: opportunity.assignedTo,
                lastStatusChange: opportunity.lastStatusChange ? new Date(opportunity.lastStatusChange) : null,
                expectedCloseDate: opportunity.expectedCloseDate ? new Date(opportunity.expectedCloseDate) : null,
                notes: opportunity.notes,
                customFields: JSON.stringify(opportunity.customFields || {}),
                updatedAt: new Date()
            },
            create: {
                opportunityId: opportunity.id,
                name: opportunity.name,
                status: opportunity.status,
                pipelineId: opportunity.pipelineId,
                pipelineStageId: opportunity.pipelineStageId,
                pipelineStageName: opportunity.pipelineStageName,
                contactId: opportunity.contactId,
                monetaryValue: opportunity.monetaryValue || 0,
                source: opportunity.source,
                assignedTo: opportunity.assignedTo,
                dateCreated: new Date(opportunity.dateCreated),
                lastStatusChange: opportunity.lastStatusChange ? new Date(opportunity.lastStatusChange) : null,
                expectedCloseDate: opportunity.expectedCloseDate ? new Date(opportunity.expectedCloseDate) : null,
                notes: opportunity.notes,
                customFields: JSON.stringify(opportunity.customFields || {}),
                locationId: opportunity.locationId,
                userId: userId
            }
        });

        console.log(`Updated opportunity: ${opportunity.id}`);
        
        // Invalidate dashboard cache
        await invalidateCache(userId, 'ghl_metrics');

    } catch (error) {
        console.error("Failed to handle opportunity event:", error);
        throw error;
    }
}

// Handle opportunity deletion
async function handleOpportunityDelete(payload: any, userId: string) {
    try {
        // Soft delete the opportunity
        await prisma.gHLOpportunity.updateMany({
            where: {
                opportunityId: payload.id,
                userId: userId
            },
            data: {
                isActive: false,
                updatedAt: new Date()
            }
        });

        console.log(`Soft deleted opportunity: ${payload.id}`);
        
        // Invalidate dashboard cache
        await invalidateCache(userId, 'ghl_metrics');

    } catch (error) {
        console.error("Failed to handle opportunity delete:", error);
        throw error;
    }
}

// Helper function to invalidate dashboard cache
async function invalidateCache(userId: string, cacheKey: string) {
    try {
        await prisma.dashboardCache.deleteMany({
            where: {
                userId: userId,
                cacheKey: cacheKey
            }
        });
        console.log(`Invalidated cache: ${cacheKey} for user: ${userId}`);
    } catch (error) {
        console.error("Failed to invalidate cache:", error);
    }
}