import { BaseConnector } from "@/lib/api/base";

export class GoHighLevelConnector extends BaseConnector {
    serviceName = "execview"; // Aliased from gohighlevel
    private baseUrl = "https://services.leadconnectorhq.com";
    private locationId: string | null = null;

    constructor(accessToken?: string | null, locationId?: string | null) {
        super(accessToken);
        this.locationId = locationId || null;
    }

    private getHeaders() {
        return {
            'Authorization': `Bearer ${this.accessToken}`,
            'Version': '2021-04-15', // Correct V2 API version
            'Content-Type': 'application/json'
        };
    }

    async fetchMetrics() {
        if (!this.accessToken) {
            throw new Error("GoHighLevel not configured - missing access token");
        }

        if (!this.locationId) {
            throw new Error("GoHighLevel not configured - missing location ID");
        }

        console.log("GHL: Fetching data for location:", this.locationId);

        // Fetch opportunities using GET with query params (correct GHL API v2 format)
        let opportunities: any[] = [];
        try {
            const oppUrl = `${this.baseUrl}/opportunities/search?location_id=${this.locationId}&limit=100`;
            console.log("GHL: Fetching opportunities from:", oppUrl);

            const opportunitiesResponse = await fetch(oppUrl, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (opportunitiesResponse.ok) {
                const opportunitiesData = await opportunitiesResponse.json();
                opportunities = opportunitiesData.opportunities || [];
                console.log("GHL: Found", opportunities.length, "opportunities");
            } else {
                const errorText = await opportunitiesResponse.text();
                console.error("GHL Opportunities API Error:", opportunitiesResponse.status, errorText);

                // Try alternative endpoint format
                const altUrl = `${this.baseUrl}/opportunities/?locationId=${this.locationId}&limit=100`;
                console.log("GHL: Trying alternative URL:", altUrl);

                const altResponse = await fetch(altUrl, {
                    method: 'GET',
                    headers: this.getHeaders()
                });

                if (altResponse.ok) {
                    const altData = await altResponse.json();
                    opportunities = altData.opportunities || [];
                    console.log("GHL: Found", opportunities.length, "opportunities (alt endpoint)");
                } else {
                    console.error("GHL Alt Opportunities Error:", altResponse.status, await altResponse.text());
                }
            }
        } catch (error) {
            console.error("GHL Opportunities fetch error:", error);
        }

        // Fetch contacts
        let contacts: any[] = [];
        try {
            const contactsUrl = `${this.baseUrl}/contacts/?locationId=${this.locationId}&limit=100`;
            console.log("GHL: Fetching contacts from:", contactsUrl);

            const contactsResponse = await fetch(contactsUrl, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (contactsResponse.ok) {
                const contactsData = await contactsResponse.json();
                contacts = contactsData.contacts || [];
                console.log("GHL: Found", contacts.length, "contacts");
            } else {
                const errorText = await contactsResponse.text();
                console.error("GHL Contacts API Error:", contactsResponse.status, errorText);
            }
        } catch (error) {
            console.error("GHL Contacts fetch error:", error);
        }

        // Calculate metrics using Eastern Time (firm is in Greenbelt, MD)
        const getEasternTimeNow = (): Date => {
            const now = new Date();
            const easternTimeStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
            return new Date(easternTimeStr);
        };

        const easternNow = getEasternTimeNow();
        const oneWeekAgo = easternNow.getTime() - 7 * 24 * 60 * 60 * 1000;
        const startOfYear = new Date(easternNow.getFullYear(), 0, 1).getTime();

        const recentOpportunities = opportunities.filter((o: any) => {
            const date = new Date(o.createdAt || o.dateCreated || o.dateAdded).getTime();
            return date > oneWeekAgo;
        });

        const ytdOpportunities = opportunities.filter((o: any) => {
            const date = new Date(o.createdAt || o.dateCreated || o.dateAdded).getTime();
            return date > startOfYear;
        });

        const recentContacts = contacts.filter((c: any) => {
            const date = new Date(c.dateAdded || c.createdAt).getTime();
            return date > oneWeekAgo;
        });

        const ytdContacts = contacts.filter((c: any) => {
            const date = new Date(c.dateAdded || c.createdAt).getTime();
            return date > startOfYear;
        });

        // Map lead sources from opportunities (more accurate than contacts)
        // Contacts often have polluted source fields (phone system artifacts, stage names)
        const leadSourceMap: { [key: string]: number } = {};
        opportunities.forEach((o: any) => {
            const contact = contacts.find((c: any) => c.id === o.contactId);
            const source = (o.source || contact?.source || 'Direct').trim();
            leadSourceMap[source] = (leadSourceMap[source] || 0) + 1;
        });

        // Intelligent Mapping for Opportunity Feed
        const opportunityFeed = opportunities.slice(0, 50).map((o: any) => {
            const contact = contacts.find((c: any) => c.id === o.contactId);
            const contactName = o.name || contact?.name ||
                (contact?.firstName && contact?.lastName ? `${contact.firstName} ${contact.lastName}` : null) ||
                contact?.firstName || "Unknown";

            return {
                id: o.id,
                lead: contactName,
                contactName: contactName,
                date: new Date(o.createdAt || o.dateCreated || Date.now()).toLocaleDateString(),
                timeOnPhone: "—",
                stage: o.pipelineStageName || this.mapStage(o.status),
                pipelineStage: o.pipelineStageName || this.mapStage(o.status),
                source: contact?.source || o.source || "Direct",
                owner: o.assignedTo || "Unassigned",
                value: o.monetaryValue || 0,
                status: o.status
            };
        });

        // Calculate conversion rates based on status
        const openOpps = opportunities.filter((o: any) => o.status === 'open').length;
        const wonOpps = opportunities.filter((o: any) => o.status === 'won').length;
        const lostOpps = opportunities.filter((o: any) => o.status === 'lost' || o.status === 'abandoned').length;
        const totalClosed = wonOpps + lostOpps;

        // Identify consultation-stage opportunities based on pipeline stage name
        // Common consultation-related stages: "Consult Scheduled", "Consultation", "Consultation Booked", etc.
        const isConsultationStage = (stageName?: string): boolean => {
            if (!stageName) return false;
            const lower = stageName.toLowerCase();
            return lower.includes('consult') || lower.includes('scheduled') || lower.includes('booked') || lower.includes('appointment');
        };

        // Count opportunities in consultation stages
        const consultationOpps = opportunities.filter((o: any) =>
            o.status === 'open' && isConsultationStage(o.pipelineStageName)
        );
        const consultationsScheduled = consultationOpps.length;

        // Count consultations scheduled this week
        const consultationsWeekly = consultationOpps.filter((o: any) => {
            const date = new Date(o.createdAt || o.dateCreated || o.dateAdded).getTime();
            return date > oneWeekAgo;
        }).length;

        // Conversion rate = won / total
        const conversionRate = opportunities.length > 0 ? (wonOpps / opportunities.length) * 100 : 0;
        const closeRate = totalClosed > 0 ? (wonOpps / totalClosed) * 100 : 0;

        // Log pipeline stages for debugging
        const stageDistribution: { [key: string]: number } = {};
        opportunities.forEach((o: any) => {
            const stage = o.pipelineStageName || o.status || 'Unknown';
            stageDistribution[stage] = (stageDistribution[stage] || 0) + 1;
        });

        console.log("GHL Metrics:", {
            totalOpportunities: opportunities.length,
            totalContacts: contacts.length,
            weeklyOpportunities: recentOpportunities.length,
            weeklyContacts: recentContacts.length,
            openOpps,
            wonOpps,
            lostOpps,
            consultationsScheduled,
            consultationsWeekly,
            conversionRate,
            stageDistribution
        });

        return {
            status: "success",
            data: {
                leadsWeekly: recentContacts.length,
                leadsYTD: ytdContacts.length,
                opportunitiesWeekly: recentOpportunities.length,
                opportunitiesYTD: ytdOpportunities.length,
                totalOpportunities: opportunities.length,
                totalContacts: contacts.length,
                consultsScheduled: consultationsScheduled,
                consultationsWeekly: consultationsWeekly,
                retainersSigned: wonOpps,
                openOpportunities: openOpps,
                conversionRate: Math.round(conversionRate * 10) / 10,
                closeRate: Math.round(closeRate * 10) / 10,
                leadSources: leadSourceMap,
                opportunityFeed,
                avgTimeOnPhone: "—"
            }
        };
    }

    private mapStage(status: string): string {
        switch (status?.toLowerCase()) {
            case 'open': return 'Open';
            case 'won': return 'Won';
            case 'lost': return 'Lost';
            case 'abandoned': return 'Abandoned';
            default: return status || 'Open';
        }
    }
}
