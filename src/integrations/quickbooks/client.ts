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

            // Fetch deposits (many law firms use deposits instead of formal payments)
            const depositData = await this.fetchDeposits();

            // Fetch sales receipts (immediate payments without invoices)
            const salesReceiptData = await this.fetchSalesReceipts();

            // Calculate metrics
            const metrics = this.calculateMetrics(profitLossData, invoiceData, paymentData, depositData, salesReceiptData);

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
            const payments = data.QueryResponse?.Payment || [];
            console.log(`QB: Found ${payments.length} payments`);
            return payments;

        } catch (error) {
            console.error("Failed to fetch payments:", error);
            return [];
        }
    }

    private async fetchDeposits() {
        try {
            // Get deposits from this year (law firms often use deposits for retainers/payments)
            const response = await fetch(
                `${this.baseUrl}/${this.realmId}/query?query=SELECT * FROM Deposit WHERE TxnDate >= '${new Date().getFullYear()}-01-01' MAXRESULTS 1000`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                console.error("QB Deposit API Error:", response.status, await response.text());
                return [];
            }

            const data = await response.json();
            const deposits = data.QueryResponse?.Deposit || [];
            console.log(`QB: Found ${deposits.length} deposits`);
            return deposits;

        } catch (error) {
            console.error("Failed to fetch deposits:", error);
            return [];
        }
    }

    private async fetchSalesReceipts() {
        try {
            // Get sales receipts from this year (immediate payments without invoices)
            const response = await fetch(
                `${this.baseUrl}/${this.realmId}/query?query=SELECT * FROM SalesReceipt WHERE TxnDate >= '${new Date().getFullYear()}-01-01' MAXRESULTS 1000`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                console.error("QB SalesReceipt API Error:", response.status, await response.text());
                return [];
            }

            const data = await response.json();
            const receipts = data.QueryResponse?.SalesReceipt || [];
            console.log(`QB: Found ${receipts.length} sales receipts`);
            return receipts;

        } catch (error) {
            console.error("Failed to fetch sales receipts:", error);
            return [];
        }
    }

    private calculateMetrics(profitLossData: any, invoices: any[], payments: any[], deposits: any[], salesReceipts: any[]) {
        // Calculate revenue from P&L report
        // P&L report structure: { Rows: { Row: [...] } } - NOT wrapped in QueryResponse
        let revenueYTD = 0;

        console.log("QB P&L Data structure:", JSON.stringify(profitLossData).substring(0, 500));

        if (profitLossData?.Rows?.Row) {
            // Parse P&L structure to find total income
            const findRevenue = (rows: any[]): number => {
                for (const row of rows) {
                    // Check for Summary row with "Total Income" or "Net Income"
                    if (row.Summary?.ColData) {
                        const label = row.Summary.ColData[0]?.value?.toLowerCase() || '';
                        if (label.includes('total income') || label.includes('gross profit')) {
                            const value = parseFloat(row.Summary.ColData[1]?.value?.replace(/[,$]/g, '') || '0');
                            console.log(`QB P&L found "${label}": ${value}`);
                            if (value > 0) return value;
                        }
                    }
                    // Check for regular row
                    if (row.ColData) {
                        const label = row.ColData[0]?.value?.toLowerCase() || '';
                        if (label.includes('total income') || label.includes('gross profit')) {
                            const value = parseFloat(row.ColData[1]?.value?.replace(/[,$]/g, '') || '0');
                            console.log(`QB P&L found "${label}": ${value}`);
                            if (value > 0) return value;
                        }
                    }
                    // Check nested rows
                    if (row.Rows?.Row) {
                        const nested = findRevenue(row.Rows.Row);
                        if (nested > 0) return nested;
                    }
                }
                return 0;
            };
            revenueYTD = findRevenue(profitLossData.Rows.Row);
        }

        // If P&L parsing failed, calculate from deposits + payments + sales receipts
        if (revenueYTD === 0) {
            console.log("QB: P&L revenue is 0, calculating from transactions instead");

            // Sum all deposits
            const depositsTotal = deposits.reduce((sum: number, dep: any) =>
                sum + parseFloat(dep.TotalAmt || 0), 0
            );

            // Sum all sales receipts
            const salesReceiptsTotal = salesReceipts.reduce((sum: number, sr: any) =>
                sum + parseFloat(sr.TotalAmt || 0), 0
            );

            // Sum all payments
            const paymentsTotal = payments.reduce((sum: number, pmt: any) =>
                sum + parseFloat(pmt.TotalAmt || 0), 0
            );

            revenueYTD = depositsTotal + salesReceiptsTotal + paymentsTotal;
            console.log(`QB: Calculated revenue from transactions - Deposits: $${depositsTotal}, Sales Receipts: $${salesReceiptsTotal}, Payments: $${paymentsTotal}, Total: $${revenueYTD}`);
        }

        // Calculate weekly metrics
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // Combine all money-in transactions for weekly collections
        const allCollections = [
            ...payments.map(p => ({ ...p, type: 'payment' })),
            ...deposits.map(d => ({ ...d, type: 'deposit' })),
            ...salesReceipts.map(sr => ({ ...sr, type: 'salesReceipt' }))
        ];

        const weeklyCollections = allCollections.filter((txn: any) =>
            new Date(txn.TxnDate) > oneWeekAgo
        );

        const paymentsCollectedWeekly = weeklyCollections.reduce((sum: number, txn: any) =>
            sum + parseFloat(txn.TotalAmt || 0), 0
        );

        // Weekly invoices for closed cases count
        const weeklyInvoices = invoices.filter((invoice: any) =>
            new Date(invoice.TxnDate) > oneWeekAgo
        );

        // Calculate average case value from all transactions
        const allTransactions = [...invoices, ...salesReceipts, ...deposits];
        const totalTransactionAmount = allTransactions.reduce((sum: number, txn: any) =>
            sum + parseFloat(txn.TotalAmt || 0), 0
        );
        const avgCaseValue = allTransactions.length > 0 ? totalTransactionAmount / allTransactions.length : 0;

        // Recent collections (last 10 from all transaction types)
        const recentCollections = allCollections
            .sort((a: any, b: any) => new Date(b.TxnDate).getTime() - new Date(a.TxnDate).getTime())
            .slice(0, 10)
            .map((txn: any) => ({
                id: txn.Id,
                clientName: txn.CustomerRef?.name || txn.EntityRef?.name || "Unknown Client",
                amount: parseFloat(txn.TotalAmt || 0),
                date: txn.TxnDate,
                type: txn.type
            }));

        console.log(`QB Metrics: Revenue YTD: $${revenueYTD}, Weekly Collections: $${paymentsCollectedWeekly}, Avg Case Value: $${avgCaseValue}`);

        return {
            revenueYTD: Math.round(revenueYTD),
            closedCasesWeekly: weeklyInvoices.length + weeklyCollections.length,
            avgCaseValue: Math.round(avgCaseValue),
            paymentsCollectedWeekly: Math.round(paymentsCollectedWeekly),
            recentCollections
        };
    }
}
