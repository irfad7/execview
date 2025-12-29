import { BaseConnector } from "@/lib/api/base";
import db from "@/lib/db";

export class QuickBooksConnector extends BaseConnector {
    serviceName = "QuickBooks";
    // private baseUrl = "https://quickbooks.api.intuit.com/v3/company";

    async fetchMetrics() {
        // 1. Get tokens from DB
        const config = db.prepare("SELECT * FROM api_configs WHERE service = ?").get(this.serviceName) as any;

        if (!config || !config.access_token) {
            throw new Error("QuickBooks not configured");
        }

        return { status: "success", data: "QuickBooks data placeholder" };
    }
}
