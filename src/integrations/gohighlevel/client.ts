import { BaseConnector } from "@/lib/api/base";
import db from "@/lib/db";

export class GoHighLevelConnector extends BaseConnector {
    serviceName = "GoHighLevel";
    // private baseUrl = "https://services.leadconnectorhq.com";

    async fetchMetrics() {
        // 1. Get tokens from DB
        const config = db.prepare("SELECT * FROM api_configs WHERE service = ?").get(this.serviceName) as any;

        if (!config || !config.access_token) {
            throw new Error("GoHighLevel not configured");
        }

        return { status: "success", data: "GoHighLevel data placeholder" };
    }
}
