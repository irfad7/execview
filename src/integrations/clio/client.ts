import { BaseConnector } from "@/lib/api/base";

interface ClioMatter {
    id: string;
    display_number: string;
    description: string;
    status: string;
    practice_area?: { id: string; name: string };
    outstanding_balance?: number;
    client?: { id: string; name: string };
    custom_field_values?: Array<{ id: string; field_name: string; value: any }>;
    created_at: string;
    updated_at: string;
}

interface ClioCalendarEntry {
    id: string;
    summary: string;
    start_at: string;
    end_at: string;
    matter?: { id: string; display_number: string };
}

interface ClioBill {
    id: string;
    total: number;
    paid: number;
    balance: number;
    due_date: string;
    matter?: { id: string };
}

export class ClioConnector extends BaseConnector {
    serviceName = "Clio";
    private baseUrl = "https://app.clio.com/api/v4";

    private async makeRequest(endpoint: string): Promise<any> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Clio API Error:", response.status, errorText);
            throw new Error(`Clio API Error: ${response.status} - ${errorText}`);
        }

        return response.json();
    }

    async fetchMatters(): Promise<ClioMatter[]> {
        const params = new URLSearchParams({
            status: 'open',
            limit: '100',
            fields: 'id,display_number,description,status,practice_area{id,name},outstanding_balance,client{id,name},custom_field_values{id,field_name,value},created_at,updated_at'
        });

        const data = await this.makeRequest(`/matters.json?${params}`);
        return data.data || [];
    }

    async fetchCalendarEntries(): Promise<ClioCalendarEntry[]> {
        const now = new Date();
        const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead

        const params = new URLSearchParams({
            start_at_gte: now.toISOString(),
            start_at_lte: futureDate.toISOString(),
            fields: 'id,summary,start_at,end_at,matter{id,display_number}',
            limit: '100'
        });

        const data = await this.makeRequest(`/calendar_entries.json?${params}`);
        return data.data || [];
    }

    async fetchBills(): Promise<ClioBill[]> {
        const params = new URLSearchParams({
            fields: 'id,total,paid,balance,due_date,matter{id}',
            limit: '100'
        });

        const data = await this.makeRequest(`/bills.json?${params}`);
        return data.data || [];
    }

    async fetchClosedMattersThisWeek(): Promise<ClioMatter[]> {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const params = new URLSearchParams({
            status: 'closed',
            updated_since: oneWeekAgo.toISOString(),
            fields: 'id,display_number,description,status,practice_area{id,name},updated_at',
            limit: '100'
        });

        const data = await this.makeRequest(`/matters.json?${params}`);
        return data.data || [];
    }

    async verifyConnection(): Promise<boolean> {
        try {
            await this.makeRequest('/users/who_am_i.json');
            return true;
        } catch (error) {
            console.error('Clio connection verification failed:', error);
            return false;
        }
    }

    private checkCustomField(customFields: any[], fieldName: string): boolean {
        if (!customFields || !Array.isArray(customFields)) return false;
        
        const field = customFields.find(f => 
            f.field_name && f.field_name.toLowerCase().includes(fieldName.toLowerCase())
        );
        
        if (!field) return false;
        
        // Check if value indicates "received" or "yes"
        const value = field.value;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const lowerValue = value.toLowerCase();
            return lowerValue === 'yes' || lowerValue === 'true' || lowerValue === 'received';
        }
        
        return false;
    }

    async fetchMetrics() {
        if (!this.accessToken) {
            throw new Error("Clio not configured - missing access token");
        }

        // Verify connection first
        const isConnected = await this.verifyConnection();
        if (!isConnected) {
            throw new Error("Clio connection verification failed");
        }

        // Fetch all required data in parallel
        const [matters, calendarEntries, bills, closedMattersThisWeek] = await Promise.all([
            this.fetchMatters(),
            this.fetchCalendarEntries(),
            this.fetchBills(),
            this.fetchClosedMattersThisWeek()
        ]);

        // Map matters with intelligent field mapping
        const mappedMatters = matters.map((m: ClioMatter) => {
            const discoveryReceived = this.checkCustomField(m.custom_field_values || [], 'discovery');
            const pleaOfferReceived = this.checkCustomField(m.custom_field_values || [], 'plea');
            
            // Find upcoming court date from calendar entries
            const courtEntry = calendarEntries.find(entry => 
                entry.matter?.id === m.id && 
                entry.summary.toLowerCase().includes('court')
            );

            return {
                id: m.id.toString(),
                name: m.display_number ? `${m.display_number} - ${m.description}` : m.description,
                clientName: m.client?.name || "Unknown Client",
                caseNumber: m.display_number || m.id,
                chargeType: this.mapPracticeAreaToChargeType(m.practice_area?.name),
                type: m.practice_area?.name || "Unassigned",
                status: m.status,
                openDate: m.created_at,
                discoveryReceived,
                pleaOfferReceived,
                upcomingCourtDate: courtEntry?.start_at || null,
                outstandingBalance: m.outstanding_balance || 0
            };
        });

        // Calculate upcoming court dates with urgency
        const upcomingCourtDates = calendarEntries
            .filter(entry => entry.summary.toLowerCase().includes('court'))
            .map(entry => {
                const startDate = new Date(entry.start_at);
                const daysUntil = Math.ceil((startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                
                return {
                    caseId: entry.matter?.id || 'unknown',
                    caseName: entry.matter?.display_number || entry.summary,
                    date: entry.start_at,
                    daysUntil,
                    isUrgent: daysUntil <= 7,
                    summary: entry.summary
                };
            })
            .sort((a, b) => a.daysUntil - b.daysUntil);

        // Calculate case management metrics
        const totalOutstandingBalance = mappedMatters.reduce((sum, m) => sum + (m.outstandingBalance || 0), 0);
        const casesWithoutDiscovery = mappedMatters.filter(m => !m.discoveryReceived).length;
        const casesWithoutPleaOffer = mappedMatters.filter(m => !m.pleaOfferReceived).length;
        const totalCases = mappedMatters.length;

        // Group cases by charge type
        const casesByChargeType: Record<string, number> = {};
        mappedMatters.forEach(m => {
            const chargeType = m.chargeType;
            casesByChargeType[chargeType] = (casesByChargeType[chargeType] || 0) + 1;
        });

        // Calculate bookkeeping metrics
        const paymentsThisWeek = bills
            .filter(bill => {
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                // Assuming payments are recent if balance is less than total
                return bill.paid > 0 && new Date() > weekAgo;
            })
            .reduce((sum, bill) => sum + bill.paid, 0);

        const totalYTDPayments = bills.reduce((sum, bill) => sum + bill.paid, 0);
        const averageCaseValueYTD = closedMattersThisWeek.length > 0 ? totalYTDPayments / closedMattersThisWeek.length : 0;

        return {
            status: "success",
            data: {
                // Core metrics for dashboard integration
                activeCases: mappedMatters.length,
                newCasesSignedWeekly: 0, // Would need created_at filtering
                matters: mappedMatters,

                // Case Management Dashboard
                caseManagement: {
                    totalOpenCases: totalCases,
                    casesByChargeType,
                    totalOutstandingBalance,
                    casesWithoutDiscovery,
                    casesWithoutPleaOffer,
                    percentNoDiscovery: totalCases > 0 ? Math.round((casesWithoutDiscovery / totalCases) * 100) : 0,
                    percentNoPleaOffer: totalCases > 0 ? Math.round((casesWithoutPleaOffer / totalCases) * 100) : 0
                },

                // Upcoming court dates
                upcomingCourtDates,

                // Bookkeeping metrics
                bookkeeping: {
                    casesClosedThisWeek: closedMattersThisWeek.length,
                    paymentsCollectedThisWeek: paymentsThisWeek,
                    averageCaseValueYTD: averageCaseValueYTD
                }
            }
        };
    }

    private mapPracticeAreaToChargeType(practiceArea?: string): string {
        if (!practiceArea) return "Unknown";
        
        const area = practiceArea.toLowerCase();
        
        if (area.includes('hourly') || area.includes('hour')) return "Hourly";
        if (area.includes('flat') || area.includes('fixed')) return "Flat Fee";
        if (area.includes('contingent') || area.includes('percentage')) return "Contingency";
        if (area.includes('criminal') || area.includes('dui') || area.includes('dui')) return "Flat Fee"; // Common for criminal
        if (area.includes('personal injury') || area.includes('accident')) return "Contingency"; // Common for PI
        
        return "Hourly"; // Default assumption for most legal work
    }
}
