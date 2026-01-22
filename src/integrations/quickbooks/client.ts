import { BaseConnector } from "@/lib/api/base";

export class QuickBooksConnector extends BaseConnector {
    serviceName = "quickbooks";
    private baseUrl = "https://quickbooks.api.intuit.com/v3/company";
    private realmId: string | null = null;

    constructor(accessToken?: string | null, realmId?: string | null) {
        super(accessToken);
        this.realmId = realmId || null;
    }

    async fetchMetrics() {
        if (!this.accessToken) {
            throw new Error("QuickBooks not configured - missing access token");
        }

        if (!this.realmId) {
            throw new Error("QuickBooks not configured - missing company ID (realmId)");
        }

        try {
            // Test connection first
            const connectionTest = await this.testConnection();
            if (!connectionTest.success) {
                throw new Error("QuickBooks connection failed");
            }

            // Fetch profit and loss report
            const profitLossData = await this.fetchProfitAndLoss();
            
            // Fetch invoice data for revenue calculations
            const invoiceData = await this.fetchInvoices();
            
            // Fetch payment data
            const paymentData = await this.fetchPayments();

            // Calculate metrics
            const metrics = this.calculateMetrics(profitLossData, invoiceData, paymentData);

            return {
                status: "success",
                data: metrics
            };

        } catch (error) {
            console.error("QuickBooks API Error:", error);
            throw error;
        }
    }

    private async testConnection() {
        try {
            const response = await fetch(
                `${this.baseUrl}/${this.realmId}/companyinfo/${this.realmId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                console.error("QB Connection Test Failed:", response.status, await response.text());
                return { success: false, error: `Connection test failed: ${response.status}` };
            }

            const data = await response.json();
            return { 
                success: true, 
                companyInfo: data.QueryResponse?.CompanyInfo?.[0] || null 
            };

        } catch (error) {
            console.error("QB Connection Error:", error);
            return { success: false, error: "Connection failed" };
        }
    }

    private async fetchProfitAndLoss() {
        try {
            // Get current year dates
            const currentYear = new Date().getFullYear();
            const startDate = `${currentYear}-01-01`;
            const endDate = new Date().toISOString().split('T')[0];

            const response = await fetch(
                `${this.baseUrl}/${this.realmId}/reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}&minorversion=65`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                console.error("QB P&L API Error:", response.status, await response.text());
                return null;
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error("Failed to fetch P&L report:", error);
            return null;
        }
    }

    private async fetchInvoices() {
        try {
            // Get invoices from this year
            const response = await fetch(
                `${this.baseUrl}/${this.realmId}/query?query=SELECT * FROM Invoice WHERE TxnDate >= '${new Date().getFullYear()}-01-01' MAXRESULTS 1000`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                console.error("QB Invoice API Error:", response.status, await response.text());
                return [];
            }

            const data = await response.json();
            return data.QueryResponse?.Invoice || [];

        } catch (error) {
            console.error("Failed to fetch invoices:", error);
            return [];
        }
    }

    private async fetchPayments() {
        try {
            // Get payments from this year
            const response = await fetch(
                `${this.baseUrl}/${this.realmId}/query?query=SELECT * FROM Payment WHERE TxnDate >= '${new Date().getFullYear()}-01-01' MAXRESULTS 1000`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                console.error("QB Payment API Error:", response.status, await response.text());
                return [];
            }

            const data = await response.json();
            return data.QueryResponse?.Payment || [];

        } catch (error) {
            console.error("Failed to fetch payments:", error);
            return [];
        }
    }

    private calculateMetrics(profitLossData: any, invoices: any[], payments: any[]) {
        // Calculate revenue from P&L report
        let revenueYTD = 0;
        if (profitLossData?.QueryResponse?.Rows) {
            // Parse P&L structure to find total income
            const findRevenue = (rows: any[]): number => {
                for (const row of rows) {
                    if (row.ColData && row.ColData[0]?.value?.toLowerCase().includes('total income')) {
                        return parseFloat(row.ColData[1]?.value?.replace(/,/g, '') || '0');
                    }
                    if (row.Rows) {
                        const nested = findRevenue(row.Rows);
                        if (nested > 0) return nested;
                    }
                }
                return 0;
            };
            revenueYTD = findRevenue(profitLossData.QueryResponse.Rows);
        }

        // Calculate weekly metrics
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const weeklyInvoices = invoices.filter((invoice: any) => 
            new Date(invoice.TxnDate) > oneWeekAgo
        );
        
        const weeklyPayments = payments.filter((payment: any) => 
            new Date(payment.TxnDate) > oneWeekAgo
        );

        const paymentsCollectedWeekly = weeklyPayments.reduce((sum: number, payment: any) => 
            sum + parseFloat(payment.TotalAmt || 0), 0
        );

        // Calculate average case value (average invoice amount)
        const totalInvoiceAmount = invoices.reduce((sum: number, invoice: any) => 
            sum + parseFloat(invoice.TotalAmt || 0), 0
        );
        const avgCaseValue = invoices.length > 0 ? totalInvoiceAmount / invoices.length : 0;

        // Recent collections (last 10 payments)
        const recentCollections = payments
            .sort((a: any, b: any) => new Date(b.TxnDate).getTime() - new Date(a.TxnDate).getTime())
            .slice(0, 10)
            .map((payment: any) => ({
                id: payment.Id,
                clientName: payment.CustomerRef?.name || "Unknown Client",
                amount: parseFloat(payment.TotalAmt || 0),
                date: payment.TxnDate
            }));

        return {
            revenueYTD: Math.round(revenueYTD),
            closedCasesWeekly: weeklyInvoices.length, // Assuming invoices represent closed cases
            avgCaseValue: Math.round(avgCaseValue),
            paymentsCollectedWeekly: Math.round(paymentsCollectedWeekly),
            recentCollections
        };
    }
}
