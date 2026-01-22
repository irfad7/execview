import { BaseConnector } from "@/lib/api/base";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface GHLLocation {
    id: string;
    name: string;
    companyName?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    timezone?: string;
}

export interface GHLContact {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    source?: string;
    tags?: string[];
    customFields?: Record<string, any>;
    dateAdded: string;
    lastActivity?: string;
    locationId: string;
}

export interface GHLOpportunity {
    id: string;
    name: string;
    status: string;
    pipelineId: string;
    pipelineStageId: string;
    pipelineStageName?: string;
    contactId: string;
    monetaryValue?: number;
    source?: string;
    assignedTo?: string;
    dateCreated: string;
    lastStatusChange?: string;
    expectedCloseDate?: string;
    notes?: string;
    customFields?: Record<string, any>;
    locationId: string;
}

export interface GHLPipeline {
    id: string;
    name: string;
    stages: Array<{
        id: string;
        name: string;
        position: number;
    }>;
}

export class EnhancedGoHighLevelConnector extends BaseConnector {
    serviceName = "execview"; // Aliased from gohighlevel
    private baseUrl = "https://services.leadconnectorhq.com";
    private locationId: string | null = null;

    constructor(accessToken?: string | null, locationId?: string | null) {
        super(accessToken);
        this.locationId = locationId || null;
    }

    // Verify connection and get location details
    async verifyConnection(): Promise<{ success: boolean; location?: GHLLocation; error?: string }> {
        if (!this.accessToken) {
            return { success: false, error: "Missing access token" };
        }

        if (!this.locationId) {
            return { success: false, error: "Missing location ID" };
        }

        try {
            const response = await fetch(`${this.baseUrl}/locations/${this.locationId}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Version': '2021-04-15',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("GHL Location API Error:", response.status, errorText);
                return { success: false, error: `API Error: ${response.status}` };
            }

            const data = await response.json();
            const location: GHLLocation = {
                id: data.location?.id || this.locationId,
                name: data.location?.name || "Unknown Location",
                companyName: data.location?.companyName,
                address: data.location?.address,
                phone: data.location?.phone,
                email: data.location?.email,
                website: data.location?.website,
                timezone: data.location?.timezone
            };

            return { success: true, location };
        } catch (error) {
            console.error("GHL Connection verification failed:", error);
            return { success: false, error: "Connection failed" };
        }
    }

    // Fetch all contacts from GHL
    async fetchContacts(limit: number = 100, offset: number = 0): Promise<GHLContact[]> {
        if (!this.accessToken || !this.locationId) {
            throw new Error("GoHighLevel not configured - missing credentials");
        }

        try {
            const response = await fetch(
                `${this.baseUrl}/contacts/?locationId=${this.locationId}&limit=${limit}&offset=${offset}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Version': '2021-04-15',
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error("GHL Contacts API Error:", response.status, errorText);
                throw new Error(`GHL Contacts API Error: ${response.status}`);
            }

            const data = await response.json();
            return (data.contacts || []).map((contact: any): GHLContact => ({
                id: contact.id,
                firstName: contact.firstName,
                lastName: contact.lastName,
                email: contact.email,
                phone: contact.phone,
                source: contact.source,
                tags: contact.tags || [],
                customFields: contact.customFields || {},
                dateAdded: contact.dateAdded || contact.createdAt || new Date().toISOString(),
                lastActivity: contact.lastActivity,
                locationId: this.locationId!
            }));
        } catch (error) {
            console.error("Failed to fetch GHL contacts:", error);
            throw error;
        }
    }

    // Fetch all opportunities from GHL
    async fetchOpportunities(limit: number = 100, offset: number = 0): Promise<GHLOpportunity[]> {
        if (!this.accessToken || !this.locationId) {
            throw new Error("GoHighLevel not configured - missing credentials");
        }

        try {
            const response = await fetch(
                `${this.baseUrl}/opportunities/search?location_id=${this.locationId}&limit=${limit}&offset=${offset}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Version': '2021-04-15',
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error("GHL Opportunities API Error:", response.status, errorText);
                throw new Error(`GHL Opportunities API Error: ${response.status}`);
            }

            const data = await response.json();
            return (data.opportunities || []).map((opp: any): GHLOpportunity => ({
                id: opp.id,
                name: opp.name || "Unnamed Opportunity",
                status: opp.status || "Open",
                pipelineId: opp.pipelineId || "",
                pipelineStageId: opp.pipelineStageId || "",
                pipelineStageName: opp.pipelineStageName,
                contactId: opp.contactId,
                monetaryValue: opp.monetaryValue || 0,
                source: opp.source,
                assignedTo: opp.assignedTo,
                dateCreated: opp.dateCreated || opp.createdAt || new Date().toISOString(),
                lastStatusChange: opp.lastStatusChange,
                expectedCloseDate: opp.expectedCloseDate,
                notes: opp.notes,
                customFields: opp.customFields || {},
                locationId: this.locationId!
            }));
        } catch (error) {
            console.error("Failed to fetch GHL opportunities:", error);
            throw error;
        }
    }

    // Fetch pipelines from GHL
    async fetchPipelines(): Promise<GHLPipeline[]> {
        if (!this.accessToken || !this.locationId) {
            throw new Error("GoHighLevel not configured - missing credentials");
        }

        try {
            const response = await fetch(
                `${this.baseUrl}/opportunities/pipelines?locationId=${this.locationId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Version': '2021-04-15',
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error("GHL Pipelines API Error:", response.status, errorText);
                throw new Error(`GHL Pipelines API Error: ${response.status}`);
            }

            const data = await response.json();
            return (data.pipelines || []).map((pipeline: any): GHLPipeline => ({
                id: pipeline.id,
                name: pipeline.name || "Unnamed Pipeline",
                stages: pipeline.stages || []
            }));
        } catch (error) {
            console.error("Failed to fetch GHL pipelines:", error);
            throw error;
        }
    }

    // Sync all GHL data to local database
    async syncAllData(userId: string): Promise<{ success: boolean; error?: string; stats?: any }> {
        try {
            // Verify connection first
            const connectionResult = await this.verifyConnection();
            if (!connectionResult.success) {
                throw new Error(connectionResult.error || "Connection verification failed");
            }

            const location = connectionResult.location!;
            
            // Update or create location record
            await prisma.gHLLocation.upsert({
                where: {
                    locationId_userId: {
                        locationId: location.id,
                        userId: userId
                    }
                },
                update: {
                    name: location.name,
                    companyName: location.companyName,
                    address: location.address,
                    phone: location.phone,
                    email: location.email,
                    website: location.website,
                    timezone: location.timezone,
                    updatedAt: new Date()
                },
                create: {
                    locationId: location.id,
                    name: location.name,
                    companyName: location.companyName,
                    address: location.address,
                    phone: location.phone,
                    email: location.email,
                    website: location.website,
                    timezone: location.timezone,
                    userId: userId
                }
            });

            // Fetch and sync contacts
            const contacts = await this.fetchContacts(100);
            let contactsCreated = 0;
            let contactsUpdated = 0;

            for (const contact of contacts) {
                const result = await prisma.gHLContact.upsert({
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
                        locationId: location.id,
                        userId: userId
                    }
                });

                if (result.createdAt === result.updatedAt) {
                    contactsCreated++;
                } else {
                    contactsUpdated++;
                }
            }

            // Fetch and sync pipelines
            const pipelines = await this.fetchPipelines();
            let pipelinesCreated = 0;
            let pipelinesUpdated = 0;

            for (const pipeline of pipelines) {
                const result = await prisma.gHLPipeline.upsert({
                    where: {
                        pipelineId_userId: {
                            pipelineId: pipeline.id,
                            userId: userId
                        }
                    },
                    update: {
                        name: pipeline.name,
                        stages: JSON.stringify(pipeline.stages),
                        updatedAt: new Date()
                    },
                    create: {
                        pipelineId: pipeline.id,
                        name: pipeline.name,
                        stages: JSON.stringify(pipeline.stages),
                        locationId: location.id,
                        userId: userId
                    }
                });

                if (result.createdAt === result.updatedAt) {
                    pipelinesCreated++;
                } else {
                    pipelinesUpdated++;
                }
            }

            // Fetch and sync opportunities
            const opportunities = await this.fetchOpportunities(100);
            let opportunitiesCreated = 0;
            let opportunitiesUpdated = 0;

            for (const opportunity of opportunities) {
                const result = await prisma.gHLOpportunity.upsert({
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
                        locationId: location.id,
                        userId: userId
                    }
                });

                if (result.createdAt === result.updatedAt) {
                    opportunitiesCreated++;
                } else {
                    opportunitiesUpdated++;
                }
            }

            // Update sync status
            await prisma.syncStatus.upsert({
                where: {
                    userId_service: {
                        userId: userId,
                        service: "gohighlevel"
                    }
                },
                update: {
                    lastUpdated: new Date(),
                    status: "success",
                    errorMessage: null
                },
                create: {
                    userId: userId,
                    service: "gohighlevel",
                    lastUpdated: new Date(),
                    status: "success"
                }
            });

            const stats = {
                contacts: { created: contactsCreated, updated: contactsUpdated },
                opportunities: { created: opportunitiesCreated, updated: opportunitiesUpdated },
                pipelines: { created: pipelinesCreated, updated: pipelinesUpdated },
                location: location.name
            };

            console.log("GHL sync completed successfully:", stats);
            return { success: true, stats };

        } catch (error) {
            console.error("GHL sync failed:", error);
            
            // Log error to database
            await prisma.syncStatus.upsert({
                where: {
                    userId_service: {
                        userId: userId,
                        service: "gohighlevel"
                    }
                },
                update: {
                    lastUpdated: new Date(),
                    status: "error",
                    errorMessage: error instanceof Error ? error.message : "Unknown error"
                },
                create: {
                    userId: userId,
                    service: "gohighlevel",
                    lastUpdated: new Date(),
                    status: "error",
                    errorMessage: error instanceof Error ? error.message : "Unknown error"
                }
            });

            return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
        }
    }

    // Get enhanced metrics from local database
    async getEnhancedMetrics(userId: string): Promise<any> {
        try {
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

            // Get contacts
            const totalContacts = await prisma.gHLContact.count({
                where: { userId, isActive: true }
            });

            const recentContacts = await prisma.gHLContact.count({
                where: {
                    userId,
                    isActive: true,
                    dateAdded: { gte: oneWeekAgo }
                }
            });

            // Get opportunities
            const totalOpportunities = await prisma.gHLOpportunity.count({
                where: { userId, isActive: true }
            });

            const recentOpportunities = await prisma.gHLOpportunity.count({
                where: {
                    userId,
                    isActive: true,
                    dateCreated: { gte: oneWeekAgo }
                }
            });

            const ytdOpportunities = await prisma.gHLOpportunity.count({
                where: {
                    userId,
                    isActive: true,
                    dateCreated: { gte: oneYearAgo }
                }
            });

            // Get consultation metrics
            const consultsScheduled = await prisma.gHLOpportunity.count({
                where: {
                    userId,
                    isActive: true,
                    OR: [
                        { pipelineStageName: { contains: "consult", mode: "insensitive" } },
                        { status: { contains: "scheduled", mode: "insensitive" } }
                    ]
                }
            });

            const retainersSigned = await prisma.gHLOpportunity.count({
                where: {
                    userId,
                    isActive: true,
                    OR: [
                        { status: { contains: "won", mode: "insensitive" } },
                        { pipelineStageName: { contains: "closed", mode: "insensitive" } },
                        { pipelineStageName: { contains: "signed", mode: "insensitive" } }
                    ]
                }
            });

            // Get lead sources
            const leadSourcesData = await prisma.gHLContact.groupBy({
                by: ['source'],
                where: { userId, isActive: true },
                _count: { source: true }
            });

            const leadSources = leadSourcesData.reduce((acc, item) => {
                const source = item.source || 'Unknown';
                acc[source] = item._count.source;
                return acc;
            }, {} as Record<string, number>);

            // Get recent opportunities for feed
            const opportunityFeed = await prisma.gHLOpportunity.findMany({
                where: { userId, isActive: true },
                include: {
                    contact: true
                },
                orderBy: { dateCreated: 'desc' },
                take: 50
            });

            const formattedFeed = opportunityFeed.map(opp => {
                const contactName = opp.contact ?
                    `${opp.contact.firstName || ''} ${opp.contact.lastName || ''}`.trim() || "Unknown Lead"
                    : opp.name || "Unknown Lead";
                const stageName = opp.pipelineStageName || opp.status || "Open";
                return {
                    id: opp.opportunityId,
                    lead: contactName,
                    contactName: contactName,
                    date: opp.dateCreated.toISOString().split('T')[0],
                    timeOnPhone: "0m", // TODO: Implement call logs integration
                    stage: stageName,
                    pipelineStage: stageName,
                    source: opp.source || opp.contact?.source || "Direct",
                    owner: opp.assignedTo || "Unassigned",
                    value: opp.monetaryValue || 0,
                    status: opp.status
                };
            });

            return {
                status: "success",
                data: {
                    leadsWeekly: recentContacts,
                    leadsYTD: totalContacts,
                    opportunitiesWeekly: recentOpportunities,
                    opportunitiesYTD: ytdOpportunities,
                    totalOpportunities: totalOpportunities,
                    totalContacts: totalContacts,
                    consultsScheduled,
                    retainersSigned,
                    conversionRate: totalContacts > 0 ? Math.round((consultsScheduled / totalContacts) * 1000) / 10 : 0,
                    closeRate: consultsScheduled > 0 ? Math.round((retainersSigned / consultsScheduled) * 1000) / 10 : 0,
                    leadSources,
                    opportunityFeed: formattedFeed,
                    avgTimeOnPhone: "0m" // TODO: Implement call analytics
                }
            };

        } catch (error) {
            console.error("Failed to get enhanced GHL metrics:", error);
            throw error;
        }
    }

    // Legacy method for backward compatibility
    async fetchMetrics() {
        // This method is kept for backward compatibility
        // For new implementations, use syncAllData() and getEnhancedMetrics()
        if (!this.accessToken) {
            throw new Error("GoHighLevel not configured - missing access token");
        }

        if (!this.locationId) {
            throw new Error("GoHighLevel not configured - missing location ID");
        }

        // Use the enhanced methods
        const contacts = await this.fetchContacts(100);
        const opportunities = await this.fetchOpportunities(100);

        // Calculate basic metrics for backward compatibility
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
        
        const recentContacts = contacts.filter(c => 
            new Date(c.dateAdded).getTime() > oneWeekAgo
        );
        
        const ytdOpportunities = opportunities.filter(o => 
            new Date(o.dateCreated).getTime() > oneYearAgo
        );

        const recentOpportunities = opportunities.filter(o => 
            new Date(o.dateCreated).getTime() > oneWeekAgo
        );

        // Map lead sources
        const leadSourceMap: { [key: string]: number } = {};
        contacts.forEach(contact => {
            const source = contact.source || 'Unknown';
            leadSourceMap[source] = (leadSourceMap[source] || 0) + 1;
        });

        // Create opportunity feed
        const opportunityFeed = opportunities.slice(0, 50).map(o => {
            const contact = contacts.find(c => c.id === o.contactId);
            const contactName = contact ?
                `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || "Unknown Lead"
                : o.name || "Unknown Lead";
            const stageName = o.pipelineStageName || o.status || "Open";
            return {
                id: o.id,
                lead: contactName,
                contactName: contactName,
                date: new Date(o.dateCreated).toISOString().split('T')[0],
                timeOnPhone: "0m",
                stage: stageName,
                pipelineStage: stageName,
                source: o.source || contact?.source || "Direct",
                owner: o.assignedTo || "Unassigned",
                value: o.monetaryValue || 0,
                status: o.status
            };
        });

        // Calculate conversion rates
        const consultsScheduled = opportunities.filter(o => 
            (o.pipelineStageName || '').toLowerCase().includes('consult') ||
            (o.status || '').toLowerCase().includes('scheduled')
        ).length;
        
        const retainersSigned = opportunities.filter(o => 
            (o.status || '').toLowerCase().includes('won') ||
            (o.pipelineStageName || '').toLowerCase().includes('closed') ||
            (o.pipelineStageName || '').toLowerCase().includes('signed')
        ).length;

        return {
            status: "success",
            data: {
                leadsWeekly: recentContacts.length,
                leadsYTD: contacts.length,
                opportunitiesWeekly: recentOpportunities.length,
                opportunitiesYTD: ytdOpportunities.length,
                totalOpportunities: opportunities.length,
                totalContacts: contacts.length,
                consultsScheduled,
                retainersSigned,
                conversionRate: contacts.length > 0 ? Math.round((consultsScheduled / contacts.length) * 1000) / 10 : 0,
                closeRate: consultsScheduled > 0 ? Math.round((retainersSigned / consultsScheduled) * 1000) / 10 : 0,
                leadSources: leadSourceMap,
                opportunityFeed,
                avgTimeOnPhone: "0m"
            }
        };
    }
}