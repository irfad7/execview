import { BaseConnector } from "@/lib/api/base";

interface ClioMatter {
    id: string;
    display_number: string;
    description: string;
    status: string;
    practice_area?: { id: string; name: string };
    // Note: outstanding_balance is NOT a valid field on the Clio v4 matters endpoint.
    // Balances are derived from bills via client.id matching.
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
    state: string;        // 'awaiting_payment' | 'paid' | 'void' | 'draft'
    issued_at: string;
    due_at: string;       // Clio uses due_at, not due_date
    client?: { id: string; name: string };  // Bills link to matters via client.id
}

// Clio custom field IDs for Shahnam's account
// NOTE: Clio v4 API returns custom_field_values[].id as a composite string
// like "date-1284285991" (the value-record ID), NOT the field definition ID.
// We use field_name matching instead; these IDs are kept for reference and
// as a secondary fallback in case Clio ever returns custom_field{id}.
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

// Mapping from field definition ID → exact field_name string returned by Clio API.
// Clio's custom_field_values[].id is the VALUE record ID (e.g. "date-1284285991"),
// not the field definition ID, so we match by field_name instead.
const CLIO_FIELD_NAME_MAP: Record<string, string> = {
    [CLIO_CUSTOM_FIELDS.PLEA_OFFER_RECEIVED]: 'Plea Offer Received?',
    [CLIO_CUSTOM_FIELDS.DISCOVERY_RECEIVED]:  'Discovery Received?',
    [CLIO_CUSTOM_FIELDS.NEXT_COURT_DATE]:     'Next Court Date',
    [CLIO_CUSTOM_FIELDS.NEXT_COURT_HEARING]:  'Next Court Hearing',
    [CLIO_CUSTOM_FIELDS.CHARGE_TYPE]:         'Charge Type',
    [CLIO_CUSTOM_FIELDS.CUSTODY_STATUS]:      'Custody Status',
    [CLIO_CUSTOM_FIELDS.CASE_NUMBER]:         'Case Number',
    [CLIO_CUSTOM_FIELDS.PLEA_OFFER_DETAILS]:  'Plea Offer',
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
        // NOTE: 'outstanding_balance' is NOT a valid field on the Clio v4 matters
        // endpoint — attempting to include it causes an InvalidFields API error.
        // Outstanding balances are fetched separately via fetchBills() and matched
        // to matters through client.id in fetchMetrics().
        const fields = 'id,display_number,description,status,practice_area{id,name},client{id,name},custom_field_values{id,field_name,value},created_at,updated_at';

        try {
            console.log("Clio: Fetching matters...");
            const params = new URLSearchParams({
                status: 'open',
                limit: '200',
                fields
            });
            const data = await this.makeRequest(`/matters.json?${params}`);
            const matters = data.data || [];
            console.log(`Clio: Found ${matters.length} open matters`);
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
            // Valid Clio v4 bill fields: id, balance, total, paid, state, issued_at, due_at, client{id,name}
            // Note: 'due_date' and 'matter' are NOT valid fields on bills in Clio v4.
            // Bills are linked to matters indirectly via client.id.
            const params = new URLSearchParams({
                fields: 'id,total,paid,balance,state,issued_at,due_at,client{id,name}',
                limit: '200'
            });

            const data = await this.makeRequest(`/bills.json?${params}`);
            return data.data || [];
        } catch (error) {
            // Bills access may not be available if bills:read scope isn't enabled
            console.warn("Clio: Could not fetch bills (bills:read scope may not be enabled):", error);
            return [];
        }
    }

    // Fetch the count of matters created since a given ISO date string.
    // Uses created_since filter which is confirmed valid on the Clio v4 matters API.
    // Status is intentionally omitted so both open and closed new matters are counted.
    private async fetchMatterCountSince(isoDate: string): Promise<number> {
        const params = new URLSearchParams({
            created_since: isoDate,
            fields: 'id',
            limit: '200'
        });
        const data = await this.makeRequest(`/matters.json?${params}`);
        return data.meta?.records ?? (data.data?.length || 0);
    }

    async fetchNewCasesCounts(): Promise<{ weekly: number; ytd: number }> {
        try {
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const jan1 = new Date(now.getFullYear(), 0, 1).toISOString();

            const [weekly, ytd] = await Promise.all([
                this.fetchMatterCountSince(sevenDaysAgo),
                this.fetchMatterCountSince(jan1)
            ]);

            console.log(`Clio: New cases signed — weekly: ${weekly}, YTD: ${ytd}`);
            return { weekly, ytd };
        } catch (error) {
            console.warn("Clio: Could not fetch new cases counts:", error);
            return { weekly: 0, ytd: 0 };
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

    // Get custom field value by field definition ID.
    // Clio v4 returns custom_field_values[].id as a composite value-record string
    // (e.g. "date-1284285991"), NOT the definition ID.  We therefore match by
    // field_name using CLIO_FIELD_NAME_MAP, with the legacy id-based check as a
    // secondary fallback in case Clio changes behaviour or returns custom_field{id}.
    private getCustomFieldById(customFields: any[], fieldId: string): any {
        if (!customFields || !Array.isArray(customFields)) return null;

        // Primary: match by the exact field_name we know for this field definition ID
        const knownFieldName = CLIO_FIELD_NAME_MAP[fieldId];
        if (knownFieldName) {
            const field = customFields.find(f => f.field_name === knownFieldName);
            if (field !== undefined) return field.value ?? null;
        }

        // Fallback: legacy id-based check (works if Clio ever returns custom_field{id})
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
        const [calendarEntries, bills, closedMattersThisWeek, newCasesCounts] = await Promise.all([
            this.fetchCalendarEntries(),
            this.fetchBills(),
            this.fetchClosedMattersThisWeek().catch(() => []),
            this.fetchNewCasesCounts()
        ]);

        // Build client → outstanding balance map from bills.
        // Clio v4 bills don't expose a direct matter link; client.id is the bridge.
        // Sum balances for awaiting_payment bills per client (exclude void/paid).
        const clientBalanceMap = new Map<string, number>();
        for (const bill of bills) {
            if (bill.client?.id && bill.state === 'awaiting_payment' && bill.balance > 0) {
                const clientId = bill.client.id.toString();
                clientBalanceMap.set(clientId, (clientBalanceMap.get(clientId) || 0) + bill.balance);
            }
        }
        console.log(`Clio: Built balance map for ${clientBalanceMap.size} clients from ${bills.length} bills`);

        // Map matters with field_name-based custom field lookup + fallback to string matching
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

            // Look up outstanding balance via client.id (bills link to matters through client)
            const clientId = m.client?.id?.toString();
            const outstandingBalance = clientId ? (clientBalanceMap.get(clientId) || 0) : 0;

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
                outstandingBalance
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
        // A bill is considered "paid this week" if state=paid and issued_at is within 7 days
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const paymentsThisWeek = bills
            .filter(bill => {
                return bill.paid > 0 && bill.state === 'paid' && new Date(bill.issued_at) >= weekAgo;
            })
            .reduce((sum, bill) => sum + bill.paid, 0);

        const totalYTDPayments = bills.reduce((sum, bill) => sum + bill.paid, 0);
        const averageCaseValueYTD = closedMattersThisWeek.length > 0 ? totalYTDPayments / closedMattersThisWeek.length : 0;

        return {
            status: "success",
            data: {
                // Core metrics for dashboard integration
                activeCases: mappedMatters.length,
                newCasesSignedWeekly: newCasesCounts.weekly,
                newCasesSignedYTD: newCasesCounts.ytd,
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
