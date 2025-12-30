import { BaseConnector } from "@/lib/api/base";
import db from "@/lib/db";

export class ClioConnector extends BaseConnector {
    serviceName = "Clio";
    private baseUrl = "https://app.clio.com/api/v4";

    async fetchMetrics() {
        // 1. Get tokens from DB
        const config = db.prepare("SELECT * FROM api_configs WHERE service = ?").get(this.serviceName) as any;

        if (!config || !config.access_token) {
            throw new Error("Clio not configured");
        }

        // 2. Fetch data (simplified for now - would call /matters)
        // const response = await fetch(`${this.baseUrl}/matters.json`, {
        //   headers: { 'Authorization': `Bearer ${config.access_token}` }
        // });
        // const data = await response.json();

        // Returning structured mock data to verify dashboard visualization
        return {
            status: "success",
            data: {
                activeCases: 45, // Dynamic ID
                newCasesSignedWeekly: 4,
                discoveryPending: 3,
                pleaOffersPending: 2,
                matters: [
                    { id: "1", name: "Estate of John Doe", discoveryReceived: true, pleaOfferReceived: false },
                    { id: "2", name: "Smith vs. Global Corp", discoveryReceived: false, pleaOfferReceived: false },
                    { id: "3", name: "DUI Defense - Mike Ross", discoveryReceived: true, pleaOfferReceived: true }
                ]
            }
        };
    }
}
