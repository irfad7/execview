import { BaseConnector } from "@/lib/api/base";
import db from "@/lib/db";

export class GoHighLevelConnector extends BaseConnector {
    serviceName = "execview"; // Aliased from gohighlevel
    // private baseUrl = "https://services.leadconnectorhq.com";

    async fetchMetrics() {
        // 1. Get tokens from DB
        const config = db.prepare("SELECT * FROM api_configs WHERE service = ?").get(this.serviceName) as any;

        if (!config || !config.access_token) {
            throw new Error("GoHighLevel not configured");
        }

        // Real API call would go here to /locations/{id} or /opportunities
        return {
            status: "success",
            data: {
                leadsWeekly: 28,
                consultsScheduled: 15,
                retainersSigned: 5,
                adSpend: 5400,
                roi: 4.5
            }
        };
    }
}
