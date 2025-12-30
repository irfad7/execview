import { BaseConnector } from "@/lib/api/base";

export class GoHighLevelConnector extends BaseConnector {
    serviceName = "execview"; // Aliased from gohighlevel
    // private baseUrl = "https://services.leadconnectorhq.com";

    async fetchMetrics() {
        if (!this.accessToken) {
            throw new Error("GoHighLevel not configured");
        }

        // Fetch opportunities (leads)
        // Note: In V2 API, we often need locationId. Assuming accessToken is bearer.
        const response = await fetch("https://services.leadconnectorhq.com/opportunities/search?limit=20", {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Version': '2021-07-28',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error("GHL API Error:", response.status, await response.text());
            throw new Error(`GHL API Error: ${response.status}`);
        }

        const data = await response.json();
        const opportunities = data.opportunities || [];

        // Calculate metrics
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentLeads = opportunities.filter((o: any) => new Date(o.createdAt).getTime() > oneWeekAgo);

        // Intelligent Mapping for Opportunity Feed
        const opportunityFeed = opportunities.map((o: any) => ({
            id: o.id,
            contactName: o.contact?.name || o.name || "Unknown Lead",
            date: o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            timeOnPhone: "0m", // Needs call logs endpoint, defaulting for now
            pipelineStage: o.pipelineStageName || o.status || "Open",
            source: o.source || "Direct",
            owner: o.assignedTo || "Unassigned"
        }));

        return {
            status: "success",
            data: {
                leadsWeekly: recentLeads.length,
                consultsScheduled: opportunities.filter((o: any) => o.status === 'open').length, // Rough proxy
                retainersSigned: opportunities.filter((o: any) => o.status === 'won').length,
                adSpend: 0, // Requires Facebook/Google Ads integration
                roi: 0,
                opportunityFeed
            }
        };
    }
}
