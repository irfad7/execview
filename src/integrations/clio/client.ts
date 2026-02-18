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

// Hardcoded Clio custom field IDs for Shahnam's account
// These are more reliable than string matching
const CLIO_CUSTOM_FIELDS = {
    PLEA_OFFER_RECEIVED: '16937551',      // checkbox - Track if plea offer received
    DISCOVERY_RECEIVED: '16937566',        // checkbox - Track if discovery received
    NEXT_COURT_DATE: '16937581',           // date - Upcoming court date
    NEXT_COURT_HEARING: '16937596',        // text_line - Hearing description
    CHARGE_TYPE: '16577596',               // picklist - Type of criminal charge
    CUSTODY_STATUS: '16573291',            // picklist - Client custody status
    CASE_NUMBER: '16592671',               // text_area - Court case number
    PLEA_OFFER_DETAILS: '16937536',        // text_area - Plea offer details
};

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
        // Start with minimal fields that should always work
        const minimalFields = 'id,display_number,description,status,practice_area{id,name},client{id,name},custom_field_values{id,field_name,value},created_at,updated_at';
        // Full fields including billing (requires bills:read scope to be enabled in Clio Developer Portal)
        const fullFields = 'id,display_number,description,status,practice_area{id,name},outstanding_balance,client{id,name},custom_field_values{id,field_name,value},created_at,updated_at';

        // Try minimal fields first (more reliable)
        try {
            console.log("Clio: Fetching matters with minimal fields...");
            const params = new URLSearchParams({
                status: 'open',
                limit: '100',
                fields: minimalFields
            });
            const data = await this.makeRequest(`/matters.json?${params}`);
            const matters = data.data || [];
            console.log(`Clio: Found ${matters.length} open matters`);

            // Try to fetch billing info separately if we got matters
            if (matters.length > 0) {
                try {
                    console.log("Clio: Attempting to fetch billing info...");
                    const billingParams = new URLSearchParams({
                        status: 'open',
                        limit: '100',
                        fields: 'id,outstanding_balance'
                    });
                    const billingData = await this.makeRequest(`/matters.json?${billingParams}`);
                    const billingMap = new Map((billingData.data || []).map((m: any) => [m.id, m.outstanding_balance]));

                    // Merge billing data into matters
                    matters.forEach((matter: any) => {
                        matter.outstanding_balance = billingMap.get(matter.id) || 0;
                    });
                    console.log("Clio: Successfully merged billing data");
                } catch (billingError) {
                    console.warn("Clio: Could not fetch billing info (bills:read scope may not be enabled):", billingError);
                    // Continue without billing data - set all to 0
                    matters.forEach((matter: any) => {
                        matter.outstanding_balance = 0;
                    });
                }
            }

            return matters;
        } catch (error) {
            console.error("Clio: Failed to fetch matters:", error);
            throw error;
        }
    }

    async fetchCalendarEntries(): Promise<ClioCalendarEntry[]> {
        try {
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
        } catch (error) {
            // Calendar access may not be available if calendars:read scope isn't enabled
            console.warn("Clio: Could not fetch calendar entries (calendars:read scope may not be enabled):", error);
            return [];
        }
    }

    async fetchBills(): Promise<ClioBill[]> {
        try {
            const params = new URLSearchParams({
                fields: 'id,total,paid,balance,due_date,matter{id}',
                limit: '100'
            });

            const data = await this.makeRequest(`/bills.json?${params}`);
            return data.data || [];
        } catch (error) {
            // Bills access may not be available if bills:read scope isn't enabled
            console.warn("Clio: Could not fetch bills (bills:read scope may not be enabled):", error);
            return [];
        }
    }

    async fetchClosedMattersThisWeek(): Promise<ClioMatter[]> {
        try {
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            const params = new URLSearchParams({
                status: 'closed',
                updated_since: oneWeekAgo.toISOString(),
                fields: 'id,display_number,description,status,practice_area{id,name},updated_at',
                limit: '100'
            });

            const data = await this.makeRequest(`/matters.json?${params}`);
            return data.data || [];
        } catch (error) {
            console.warn("Clio: Could not fetch closed matters:", error);
            return [];
        }
    }

    async verifyConnection(): Promise<boolean> {
        try {
            // Try who_am_i first (requires users:read scope)
            const response = await fetch(`${this.baseUrl}/users/who_am_i.json`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                return true;
            }

            // If who_am_i fails with 403, try a simple matters query instead
            // This can happen if users:read scope isn't enabled in Clio Developer Portal
            if (response.status === 403) {
                console.warn('Clio: who_am_i returned 403, trying matters endpoint as fallback...');
                const mattersResponse = await fetch(`${this.baseUrl}/matters.json?limit=1&fields=id`, {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (mattersResponse.ok) {
                    console.log('Clio: Connection verified via matters endpoint');
                    return true;
                }
            }

            console.error('Clio connection verification failed:', response.status);
            return false;
        } catch (error) {
            console.error('Clio connection verification failed:', error);
            return false;
        }
    }

    // Get custom field value by hardcoded ID (more reliable than string matching)
    private getCustomFieldById(customFields: any[], fieldId: string): any {
        if (!customFields || !Array.isArray(customFields)) return null;

        const field = customFields.find(f =>
            f.id?.toString() === fieldId || f.custom_field?.id?.toString() === fieldId
        );

        return field?.value ?? null;
    }

    // Check if a checkbox custom field is checked (true)
    private isCheckboxFieldTrue(customFields: any[], fieldId: string): boolean {
        const value = this.getCustomFieldById(customFields, fieldId);

        if (value === null || value === undefined) return false;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const lowerValue = value.toLowerCase();
            return lowerValue === 'yes' || lowerValue === 'true' || lowerValue === 'received' || lowerValue === '1';
        }

        return false;
    }

    // Legacy string matching fallback (in case IDs change or for other accounts)
    private checkCustomFieldByName(customFields: any[], fieldName: string): boolean {
        if (!customFields || !Array.isArray(customFields)) return false;

        const field = customFields.find(f =>
            f.field_name && f.field_name.toLowerCase().includes(fieldName.toLowerCase())
        );

        if (!field) return false;

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

        // Try to fetch matters first - this is the core data we need
        // Don't require verifyConnection since it may fail due to scope limitations
        let matters: ClioMatter[] = [];
        try {
            matters = await this.fetchMatters();
        } catch (error) {
            // If we can't even fetch matters, the token is likely invalid
            console.error("Clio: Failed to fetch matters:", error);
            throw new Error(`Clio API error: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Fetch additional data - these may fail due to scope limitations, which is OK
        const [calendarEntries, bills, closedMattersThisWeek] = await Promise.all([
            this.fetchCalendarEntries(),
            this.fetchBills(),
            this.fetchClosedMattersThisWeek().catch(() => []) // Don't fail if this errors
        ]);

        // Map matters with hardcoded field IDs (reliable) + fallback to string matching
        const mappedMatters = matters.map((m: ClioMatter) => {
            const customFields = m.custom_field_values || [];

            // Use hardcoded field IDs first, fallback to string matching
            const discoveryReceived = this.isCheckboxFieldTrue(customFields, CLIO_CUSTOM_FIELDS.DISCOVERY_RECEIVED)
                || this.checkCustomFieldByName(customFields, 'discovery');
            const pleaOfferReceived = this.isCheckboxFieldTrue(customFields, CLIO_CUSTOM_FIELDS.PLEA_OFFER_RECEIVED)
                || this.checkCustomFieldByName(customFields, 'plea');

            // Get additional custom field data
            const nextCourtDate = this.getCustomFieldById(customFields, CLIO_CUSTOM_FIELDS.NEXT_COURT_DATE);
            const nextCourtHearing = this.getCustomFieldById(customFields, CLIO_CUSTOM_FIELDS.NEXT_COURT_HEARING);
            const chargeTypeCustom = this.getCustomFieldById(customFields, CLIO_CUSTOM_FIELDS.CHARGE_TYPE);
            const custodyStatus = this.getCustomFieldById(customFields, CLIO_CUSTOM_FIELDS.CUSTODY_STATUS);
            const caseNumberCustom = this.getCustomFieldById(customFields, CLIO_CUSTOM_FIELDS.CASE_NUMBER);
            const pleaOfferDetails = this.getCustomFieldById(customFields, CLIO_CUSTOM_FIELDS.PLEA_OFFER_DETAILS);

            // Find upcoming court date from calendar entries as fallback
            const courtEntry = calendarEntries.find(entry =>
                entry.matter?.id === m.id &&
                entry.summary.toLowerCase().includes('court')
            );

            return {
                id: m.id.toString(),
                name: m.display_number ? `${m.display_number} - ${m.description}` : m.description,
                clientName: m.client?.name || "Unknown Client",
                caseNumber: caseNumberCustom || m.display_number || m.id,
                chargeType: chargeTypeCustom || this.mapPracticeAreaToChargeType(m.practice_area?.name),
                type: m.practice_area?.name || "Unassigned",
                status: m.status,
                openDate: m.created_at,
                discoveryReceived,
                pleaOfferReceived,
                pleaOfferDetails,
                custodyStatus,
                upcomingCourtDate: nextCourtDate || courtEntry?.start_at || null,
                nextCourtHearing,
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
