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

    private getDateRange() {
        // Fetch last 2 years of data for proper date filtering
        const now = new Date();
        const twoYearsAgo = new Date(now);
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        return {
            startDate: twoYearsAgo.toISOString().split('T')[0],
            endDate: now.toISOString().split('T')[0],
            ytdStartDate: `${now.getFullYear()}-01-01`
        };
    }

    private async fetchProfitAndLoss() {
        try {
            // Get current year dates for P&L (YTD is standard for this report)
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
            // Get invoices from last 2 years for date filtering
            const { startDate } = this.getDateRange();
            const response = await fetch(
                `${this.baseUrl}/${this.realmId}/query?query=SELECT * FROM Invoice WHERE TxnDate >= '${startDate}' MAXRESULTS 1000`,
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
            // Get payments from last 2 years for date filtering
            const { startDate } = this.getDateRange();
            const response = await fetch(
                `${this.baseUrl}/${this.realmId}/query?query=SELECT * FROM Payment WHERE TxnDate >= '${startDate}' MAXRESULTS 1000`,
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
            // Get deposits from last 2 years for date filtering
            const { startDate } = this.getDateRange();
            const response = await fetch(
                `${this.baseUrl}/${this.realmId}/query?query=SELECT * FROM Deposit WHERE TxnDate >= '${startDate}' MAXRESULTS 1000`,
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
            // Get sales receipts from last 2 years for date filtering
            const { startDate } = this.getDateRange();
            const response = await fetch(
                `${this.baseUrl}/${this.realmId}/query?query=SELECT * FROM SalesReceipt WHERE TxnDate >= '${startDate}' MAXRESULTS 1000`,
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

    // Extract client name from various QB transaction types
    private extractClientName(txn: any): string {
        // For Payments and Sales Receipts - CustomerRef is standard
        if (txn.CustomerRef?.name) {
            return txn.CustomerRef.name;
        }

        // For Deposits - client info is in Line items
        if (txn.Line && Array.isArray(txn.Line)) {
            for (const line of txn.Line) {
                // Check DepositLineDetail.Entity (most common for deposits)
                if (line.DepositLineDetail?.Entity?.name) {
                    return line.DepositLineDetail.Entity.name;
                }
                // Check LinkedTxn for payment references
                if (line.LinkedTxn && line.LinkedTxn.length > 0) {
                    // LinkedTxn might reference a payment/invoice with customer info
                    const linkedName = line.LinkedTxn[0]?.TxnId;
                    if (linkedName) continue; // We'd need another API call to resolve this
                }
            }
        }

        // Check EntityRef (used in some transaction types)
        if (txn.EntityRef?.name) {
            return txn.EntityRef.name;
        }

        // Try PrivateNote or Memo as last resort (sometimes contains client info)
        if (txn.PrivateNote) {
            // Extract potential client name from memo (first line or before colon)
            const firstLine = txn.PrivateNote.split('\n')[0].split(':')[0].trim();
            if (firstLine && firstLine.length < 50) {
                return firstLine;
            }
        }

        if (txn.Memo) {
            const firstLine = txn.Memo.split('\n')[0].split(':')[0].trim();
            if (firstLine && firstLine.length < 50) {
                return firstLine;
            }
        }

        // Check DocNumber as it sometimes contains client reference
        if (txn.DocNumber && txn.DocNumber.length < 30) {
            return `Ref: ${txn.DocNumber}`;
        }

        return "Client Payment";
    }

    private calculateMetrics(profitLossData: any, invoices: any[], payments: any[], deposits: any[], salesReceipts: any[]) {
        // Calculate revenue and ad spend from P&L report
        // P&L report structure: { Rows: { Row: [...] } } - NOT wrapped in QueryResponse
        let revenueYTD = 0;
        let adSpendYTD = 0;

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

            // Parse P&L structure to find advertising/marketing expenses
            const findAdSpend = (rows: any[]): number => {
                let total = 0;
                for (const row of rows) {
                    // Check for expense rows containing advertising/marketing keywords
                    if (row.ColData) {
                        const label = row.ColData[0]?.value?.toLowerCase() || '';
                        if (label.includes('advertising') || label.includes('marketing') ||
                            label.includes('ad spend') || label.includes('promotion') ||
                            label.includes('google ads') || label.includes('facebook ads') ||
                            label.includes('social media') || label.includes('seo') ||
                            label.includes('ppc') || label.includes('lead generation')) {
                            const value = parseFloat(row.ColData[1]?.value?.replace(/[,$]/g, '') || '0');
                            console.log(`QB P&L found ad expense "${label}": ${value}`);
                            total += value;
                        }
                    }
                    // Check Summary rows (for category totals)
                    if (row.Summary?.ColData) {
                        const label = row.Summary.ColData[0]?.value?.toLowerCase() || '';
                        if (label.includes('total advertising') || label.includes('total marketing')) {
                            const value = parseFloat(row.Summary.ColData[1]?.value?.replace(/[,$]/g, '') || '0');
                            console.log(`QB P&L found ad total "${label}": ${value}`);
                            // Use category total instead of individual items if found
                            return value;
                        }
                    }
                    // Check nested rows
                    if (row.Rows?.Row) {
                        total += findAdSpend(row.Rows.Row);
                    }
                }
                return total;
            };

            revenueYTD = findRevenue(profitLossData.Rows.Row);
            adSpendYTD = findAdSpend(profitLossData.Rows.Row);
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

        // Combine all money-in transactions
        const allCollections = [
            ...payments.map(p => ({ ...p, _type: 'payment' })),
            ...deposits.map(d => ({ ...d, _type: 'deposit' })),
            ...salesReceipts.map(sr => ({ ...sr, _type: 'salesReceipt' }))
        ];

        // Calculate average case value from all transactions
        const allTransactions = [...invoices, ...salesReceipts, ...deposits];
        const totalTransactionAmount = allTransactions.reduce((sum: number, txn: any) =>
            sum + parseFloat(txn.TotalAmt || 0), 0
        );
        const avgCaseValue = allTransactions.length > 0 ? totalTransactionAmount / allTransactions.length : 0;

        // Create normalized transactions array for frontend date filtering
        // All filtering will happen on the frontend based on the selected date range
        const transactions = allCollections.map((txn: any) => ({
            id: txn.Id,
            type: txn._type as 'deposit' | 'payment' | 'salesReceipt' | 'invoice',
            clientName: this.extractClientName(txn),
            amount: parseFloat(txn.TotalAmt || 0),
            date: txn.TxnDate,
            account: txn.DepositToAccountRef?.name || txn.AccountRef?.name
        }));

        console.log(`QB Metrics: Revenue YTD: $${revenueYTD}, Ad Spend YTD: $${adSpendYTD}, Avg Case Value: $${avgCaseValue}, Total Transactions: ${transactions.length}`);

        // Calculate legacy weekly metrics for backward compatibility
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const weeklyTransactions = transactions.filter(t => new Date(t.date) >= oneWeekAgo);
        const paymentsCollectedWeekly = weeklyTransactions.reduce((sum, t) => sum + t.amount, 0);

        return {
            revenueYTD: Math.round(revenueYTD),
            adSpendYTD: Math.round(adSpendYTD),
            avgCaseValue: Math.round(avgCaseValue),
            transactions,
            // Legacy properties for backward compatibility
            closedCasesWeekly: 0, // Not tracked in QB
            paymentsCollectedWeekly: Math.round(paymentsCollectedWeekly),
            recentCollections: transactions.slice(0, 10).map(t => ({
                id: t.id,
                clientName: t.clientName,
                amount: t.amount,
                date: t.date,
                type: t.type
            }))
        };
    }
}
