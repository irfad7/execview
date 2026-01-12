import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { EnhancedGoHighLevelConnector } from "@/integrations/gohighlevel/enhanced-client";
import { headers } from "next/headers";

const prisma = new PrismaClient();

// Cron secret for security (set in environment variables)
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
    try {
        // Verify cron secret for security
        const headersList = await headers();
        const authHeader = headersList.get('authorization');
        
        if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        console.log("Starting scheduled GHL sync job...");

        // Get all active GHL integrations
        const activeIntegrations = await prisma.apiConfig.findMany({
            where: {
                service: "execview", // GHL service alias
                isActive: true,
                accessToken: { not: null },
                realmId: { not: null } // locationId stored in realmId
            }
        });

        console.log(`Found ${activeIntegrations.length} active GHL integrations`);

        const results = [];
        let totalSuccess = 0;
        let totalErrors = 0;

        for (const integration of activeIntegrations) {
            try {
                console.log(`Syncing GHL data for user: ${integration.userId}`);

                const connector = new EnhancedGoHighLevelConnector(
                    integration.accessToken,
                    integration.realmId // locationId
                );

                // Perform full sync
                const syncResult = await connector.syncAllData(integration.userId);

                if (syncResult.success) {
                    totalSuccess++;
                    console.log(`Successfully synced GHL for user ${integration.userId}:`, syncResult.stats);
                    
                    results.push({
                        userId: integration.userId,
                        status: "success",
                        stats: syncResult.stats,
                        timestamp: new Date().toISOString()
                    });

                    // Invalidate dashboard cache to force refresh
                    await prisma.dashboardCache.deleteMany({
                        where: {
                            userId: integration.userId,
                            cacheKey: "ghl_metrics"
                        }
                    });

                } else {
                    totalErrors++;
                    console.error(`Failed to sync GHL for user ${integration.userId}:`, syncResult.error);
                    
                    results.push({
                        userId: integration.userId,
                        status: "error",
                        error: syncResult.error,
                        timestamp: new Date().toISOString()
                    });
                }

                // Add delay between syncs to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                totalErrors++;
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                
                console.error(`Sync failed for user ${integration.userId}:`, error);
                
                results.push({
                    userId: integration.userId,
                    status: "error",
                    error: errorMessage,
                    timestamp: new Date().toISOString()
                });

                // Log error to database
                await prisma.log.create({
                    data: {
                        service: "gohighlevel",
                        level: "error",
                        message: "Scheduled sync failed",
                        details: JSON.stringify({
                            userId: integration.userId,
                            error: errorMessage
                        }),
                        userId: integration.userId
                    }
                });
            }
        }

        // Process any unprocessed webhooks
        const unprocessedWebhooks = await prisma.gHLWebhook.findMany({
            where: {
                processed: false,
                createdAt: {
                    // Only process webhooks from last 24 hours to avoid processing very old ones
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
            },
            take: 100, // Process max 100 webhooks per cron run
            orderBy: { createdAt: 'asc' }
        });

        console.log(`Processing ${unprocessedWebhooks.length} unprocessed webhooks`);

        for (const webhook of unprocessedWebhooks) {
            try {
                // Find the API config for this webhook
                const apiConfig = await prisma.apiConfig.findFirst({
                    where: {
                        service: "execview",
                        realmId: webhook.locationId,
                        isActive: true
                    }
                });

                if (apiConfig) {
                    await processWebhook(webhook.id, apiConfig);
                } else {
                    // Mark webhook as processed if no config found
                    await prisma.gHLWebhook.update({
                        where: { id: webhook.id },
                        data: {
                            processed: true,
                            processedAt: new Date(),
                            errorMessage: "No active integration found"
                        }
                    });
                }
            } catch (error) {
                console.error(`Failed to process webhook ${webhook.id}:`, error);
            }
        }

        const summary = {
            totalIntegrations: activeIntegrations.length,
            successfulSyncs: totalSuccess,
            failedSyncs: totalErrors,
            webhooksProcessed: unprocessedWebhooks.length,
            completedAt: new Date().toISOString(),
            results
        };

        console.log("GHL sync job completed:", summary);

        // Log successful completion
        await prisma.log.create({
            data: {
                service: "gohighlevel",
                level: "info",
                message: "Scheduled sync completed",
                details: JSON.stringify(summary),
                userId: "system"
            }
        });

        return NextResponse.json(summary);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Cron job failed:", error);

        // Log cron failure
        await prisma.log.create({
            data: {
                service: "gohighlevel",
                level: "error", 
                message: "Scheduled sync job failed",
                details: JSON.stringify({ error: errorMessage }),
                userId: "system"
            }
        });

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

// Helper function to process individual webhook (copied from webhook route)
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

    } catch (error) {
        await prisma.gHLWebhook.update({
            where: { id: webhookId },
            data: {
                errorMessage: error instanceof Error ? error.message : "Processing failed"
            }
        });
        
        throw error;
    }
}

// Helper functions for webhook processing
async function handleContactEvent(payload: any, connector: EnhancedGoHighLevelConnector, userId: string) {
    const contacts = await connector.fetchContacts(1, 0);
    const contact = contacts.find(c => c.id === payload.id);
    
    if (!contact) return;

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
}

async function handleContactDelete(payload: any, userId: string) {
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
}

async function handleOpportunityEvent(payload: any, connector: EnhancedGoHighLevelConnector, userId: string) {
    const opportunities = await connector.fetchOpportunities(1, 0);
    const opportunity = opportunities.find(o => o.id === payload.id);
    
    if (!opportunity) return;

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
}

async function handleOpportunityDelete(payload: any, userId: string) {
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
}