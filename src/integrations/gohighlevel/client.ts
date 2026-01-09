import { BaseConnector } from "@/lib/api/base";

export class GoHighLevelConnector extends BaseConnector {
    serviceName = "execview"; // Aliased from gohighlevel
    private baseUrl = "https://services.leadconnectorhq.com";
    private locationId: string | null = null;

    constructor(accessToken?: string | null, locationId?: string | null) {
        super(accessToken);
        this.locationId = locationId || null;
    }

    async fetchMetrics() {
        if (!this.accessToken) {
            throw new Error("GoHighLevel not configured - missing access token");
        }

        if (!this.locationId) {
            throw new Error("GoHighLevel not configured - missing location ID");
        }

        // Fetch opportunities (leads) with location ID
        const opportunitiesResponse = await fetch(`${this.baseUrl}/opportunities/search?limit=100&location_id=${this.locationId}`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Version': '2021-07-28',
                'Content-Type': 'application/json'
            }
        });

        if (!opportunitiesResponse.ok) {
            console.error("GHL Opportunities API Error:", opportunitiesResponse.status, await opportunitiesResponse.text());
            throw new Error(`GHL Opportunities API Error: ${opportunitiesResponse.status}`);
        }

        const opportunitiesData = await opportunitiesResponse.json();
        const opportunities = opportunitiesData.opportunities || [];

        // Fetch contacts for lead sources
        const contactsResponse = await fetch(`${this.baseUrl}/contacts/?locationId=${this.locationId}&limit=100`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Version': '2021-07-28',
                'Content-Type': 'application/json'
            }
        });

        let contacts = [];
        if (contactsResponse.ok) {
            const contactsData = await contactsResponse.json();
            contacts = contactsData.contacts || [];
        }

        // Calculate metrics
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
        
        const recentOpportunities = opportunities.filter((o: any) => 
            new Date(o.dateCreated || o.createdAt).getTime() > oneWeekAgo
        );
        
        const ytdOpportunities = opportunities.filter((o: any) => 
            new Date(o.dateCreated || o.createdAt).getTime() > oneYearAgo
        );

        const recentContacts = contacts.filter((c: any) => 
            new Date(c.dateAdded || c.createdAt).getTime() > oneWeekAgo
        );

        // Map lead sources
        const leadSourceMap: { [key: string]: number } = {};
        contacts.forEach((contact: any) => {
            const source = contact.source || contact.leadSource || 'Unknown';
            leadSourceMap[source] = (leadSourceMap[source] || 0) + 1;
        });

        // Intelligent Mapping for Opportunity Feed
        const opportunityFeed = opportunities.slice(0, 50).map((o: any) => {
            const contact = contacts.find((c: any) => c.id === o.contactId);
            return {
                id: o.id,
                contactName: contact?.name || o.name || "Unknown Lead",
                date: o.dateCreated || o.createdAt ? new Date(o.dateCreated || o.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                timeOnPhone: "0m", // TODO: Implement call logs integration
                pipelineStage: o.pipelineStageName || o.status || "Open",
                source: contact?.source || contact?.leadSource || "Direct",
                owner: o.assignedTo || "Unassigned",
                value: o.monetaryValue || 0
            };
        });

        // Calculate conversion rates
        const consultsScheduled = opportunities.filter((o: any) => 
            (o.pipelineStageName || '').toLowerCase().includes('consult') ||
            (o.status || '').toLowerCase().includes('scheduled')
        ).length;
        
        const retainersSigned = opportunities.filter((o: any) => 
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
                consultsScheduled,
                retainersSigned,
                conversionRate: contacts.length > 0 ? (consultsScheduled / contacts.length) * 100 : 0,
                closeRate: consultsScheduled > 0 ? (retainersSigned / consultsScheduled) * 100 : 0,
                leadSources: leadSourceMap,
                opportunityFeed,
                avgTimeOnPhone: "0m" // TODO: Implement call analytics
            }
        };
    }
}
