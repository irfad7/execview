# Changelog

All notable changes to ExecView - Executive Law Firm Dashboard.

## [1.3.2] - 2026-02-18

### Fixed — Weekly email report: three data accuracy bugs

#### `src/app/api/reporting/weekly/route.ts`
- **Revenue This Week was always $0** — was reading `qb.paymentsCollectedWeekly` which was never written to the `qb` sub-object in cache. Now sums `qb.transactions` filtered to last 7 days directly in the route (same source the bookkeeping page uses).
- **Junk lead sources in email** — removed second loop that re-added all unrecognised GHL source strings (`call_made`, `name via lookup`, `couldn't find caller name`, `retainer sent`, etc.) back into the `leadSources` payload after the known-sources filter. Email now shows only the 5 real marketing channels.
- **Conversion rate section labels were wrong** — renamed local variables and clarified that `ghl.conversionRate` = won/total leads ("Lead → Retainer") and `ghl.closeRate` = won/(won+lost) ("Close Rate"). Previous labels "Lead → Consultation" and "Consult → Retainer" did not match the underlying formulas.

#### `src/components/email/FirmMetricsEmail.ts`
- Updated conversion rate cell labels: `Lead → Consultation` → `Lead → Retainer`; `Consult → Retainer` → `Close Rate`

---

## [1.3.1] - 2026-02-18

### Added — Resend email library + full weekly Firm Metrics Report

#### New files
- **`src/lib/resendEmail.ts`** — Resend SDK wrapper; exports `sendWeeklyFirmReport(to, data)` and `WeeklyReportEmailData` type
- **`src/components/email/FirmMetricsEmail.ts`** — Self-contained pure-HTML email template (table-based, fully inline styles for email client compatibility); covers all 8 metric sections

#### Email template covers (Google Reviews excluded — data unavailable)
1. Revenue — Weekly + YTD (QuickBooks)
2. New Leads — Weekly + YTD (GoHighLevel)
3. Conversion Rate — Consults/Leads % + Retainers/Consults % (GoHighLevel)
4. Marketing ROI — YTD ROI %, Cost Per Acquisition, Net Return (QuickBooks + GHL)
5. Leads by Source — bar chart (Google LSA, Social Media, Website/SEO, Google Business Profile, Referrals)
6. New Cases Signed — Weekly + YTD (Clio)
7. Active Cases — point-in-time count (Clio)

#### Updated files
- **`src/app/api/reporting/weekly/route.ts`** — Replaced Nodemailer/mock-data implementation with:
  - Real `getCachedData()` pull from dashboard cache
  - Full `WeeklyReportEmailData` assembly from live `FirmMetrics`
  - Resend delivery via `sendWeeklyFirmReport()`
  - Resend message ID logged on success; error logged on failure
- **`.env.local`** — Added `RESEND_API_KEY` and `RESEND_FROM_EMAIL`

#### Installed
- `resend` npm package (v4.x)

---

## [1.3.0] - 2026-02-18

### Fixed — All dashboard date-filter mismatches + court date display

#### Cases page
- **Court dates rendered as raw ISO strings** (e.g. `2025-09-22T13:00:00-04:00`) — now formatted as `Sep 22, 2025` via `formatCourtDate()` helper

#### Metrics page
- **New Cases Signed** used `retainersInPeriod || newCasesSignedYTD` — if GHL had 0 retainers in the selected period it would fall back to the Clio YTD total (13), showing a wrong number
- Now computes `newCasesInPeriod` by filtering `data.clio` on `openDate` using `isInRange()` — fully responds to date filter, uses correct source

#### Overview page (3 cards fixed)
- **Retainers Signed** — was showing cached GHL total (`data.ghl.retainersSigned`) regardless of date filter; now counts retainer/signed/hired stage opportunities from the already-filtered `filteredOpportunities`
- **Consultations** — same problem, same fix using consult/scheduled/booked stage filter
- **New Signed Cases** — was showing `data.newCasesSignedWeekly` (fixed 7-day window) regardless of date filter; now filters `data.clio` by `openDate` using `isInRange()` — YTD stat in the same card still shows Clio YTD

#### Leads page
- **Conversion Rate** — was showing `data.ghl.conversionRate` (a stale pre-computed total that never changed); now calculated as `retainers / totalLeads` from the date-filtered opportunity feed; added sub-label showing the formula and period

---

## [1.2.9] - 2026-02-18

### Fixed — New Cases Signed (Weekly + YTD)

- **Weekly was always `0`**: `newCasesSignedWeekly` was never populated from real data
- **YTD used wrong source**: `newCasesSignedYTD` was sourced from GHL `retainersSigned`
  (a CRM pipeline stage, not ground truth) and was the only count being set at all

**Root cause:** Clio matter `created_at` is the correct source — a matter is only
created in Clio once the retainer is signed and the file is opened, making it
equivalent to "retainers signed." No GHL webhook is needed.

**Changes:**
- Added `fetchMatterCountSince(isoDate)` private helper to Clio client — uses
  confirmed-valid `created_since` filter on the matters endpoint, counts all statuses
- Added `fetchNewCasesCounts()` to Clio client — runs two parallel calls:
  - Weekly: matters created since 7 days ago
  - YTD: matters created since Jan 1 of current year
- `fetchMetrics()` now includes `newCasesSignedWeekly` and `newCasesSignedYTD` in
  its return value (both sourced from Clio `created_at`)
- `dbActions.ts`: reads both counts from Clio result; removed the GHL
  `retainersSigned` override that was incorrectly setting `newCasesSignedWeekly`

**Verified against live Clio data:** 2 new cases this week, 13 YTD

---

## [1.2.8] - 2026-02-18

### Fixed
- **Lead Source Counts**: Fixed Google LSA showing 45 instead of 67 — source breakdown was built from contacts API (limited + polluted source fields), now correctly built from opportunities API
- **Junk Lead Sources Removed**: Filtered out phone system artifacts and pipeline stage names from Leads by Source chart (`call_made`, `name via lookup`, `couldn't find caller name`, `retainer sent`)

### Removed
- **Export PDF buttons**: Removed non-functional Export PDF buttons from Metrics, Leads, Bookkeeping, and Cases pages

---

## [1.2.7] - 2026-02-18

### Fixed — Clio API data mismatches (Discovery, Plea Offer, Court Date, Balance)

Root cause: three separate API contract violations in `src/integrations/clio/client.ts`.

#### Bug 1 — `getCustomFieldById` always returned `null`
- **Root cause**: Clio v4 returns `custom_field_values[].id` as a composite value-record
  string like `"date-1284285991"`, NOT the field definition ID (e.g. `16937581`).
  Every ID-based lookup silently failed and fell through to the name-based checkbox
  fallback — which only covers Discovery/Plea booleans, not dates or text fields.
- **Impact**: Court dates stored in the "Next Court Date" custom field were always
  `null`; Plea Offer details were always `null`; Charge Type / Case Number / Custody
  Status came from fallback logic instead of the actual field values.
- **Fix**: Added `CLIO_FIELD_NAME_MAP` (definition ID → exact `field_name` string)
  and rewrote `getCustomFieldById` to match by `field_name` first, with the legacy
  id-based check kept as a secondary fallback.

#### Bug 2 — `outstanding_balance` is not a valid Clio v4 matters field
- **Root cause**: The code requested `fields=id,outstanding_balance` on the matters
  endpoint. Clio returns `{"error":{"type":"InvalidFields",...}}`, the catch-block
  silently swallowed the error and defaulted every case balance to `$0`.
- **Fix**: Removed the invalid `outstanding_balance` request from `fetchMatters`.
  Balances are now derived from `fetchBills()` and matched to matters via `client.id`.

#### Bug 3 — `fetchBills` used invalid field names
- **Root cause**: Fields `due_date` and `matter` do not exist on Clio v4 bill objects.
  The correct names are `due_at` and (no direct matter link — bills attach to clients).
- **Fix**: Updated `fetchBills` to use `fields=id,total,paid,balance,state,issued_at,due_at,client{id,name}`.
  Updated `ClioBill` interface to match. Bills are now linked to matters via `client.id`.

#### Additional improvements
- `fetchMetrics` now builds a `clientId → outstanding balance` map from awaiting-payment
  bills and assigns it to each matter during mapping.
- Payments-this-week calculation now correctly filters by `state === 'paid'` and
  `issued_at` date rather than a vacuous date comparison.
- `fetchMatters` limit raised from 100 → 200 to handle firm growth.
- `ClioMatter` interface annotated to document why `outstanding_balance` is absent.

---

## [1.2.6] - 2026-02-18

### Fixed
- **QB Ad Spend Token Refresh**: Manually refreshed QB access token + cleared dashboard cache to force fresh sync with adSpendYTD data

### Verified
- **QuickBooks P&L confirmed**: "Advertising & marketing" expense category exists ($514.86 YTD as of today)
  - Row type: `ColData` → `type: "Data"` inside a `Section` group
  - Parser correctly matches label via `.includes('advertising')` + `.includes('marketing')`
  - adSpendYTD will now populate on next dashboard load

---

## [1.2.5] - 2026-02-18

### Major Cleanup - Production Ready
This release focuses on making the app operational and removing all scaffolding/non-functional elements.

### Removed
- **Integrations Page**: Removed from sidebar navigation (functionality moved to Admin Panel)
  - Page now redirects to /admin
  - Removed DisconnectButton component
- **Non-functional Buttons Across All Pages**:
  - Metrics page: "Details" button
  - Leads page: "Filter", "Add New Lead", "More" menu, "Load More Opportunities"
  - Overview page: Fixed link to /admin instead of /integrations

### Changed
- Simplified navigation - only 6 main sections now
- Cleaner Leads page table without action columns
- All pages now have consistent, functional interfaces

### Technical
- Cleaned up unused imports across all pages
- Removed dead code and unused components

---

## [1.2.4] - 2026-02-18

### Fixed
- **Bookkeeping Page Cleanup**: Removed fake metrics and non-functional buttons
  - Removed "Draft Invoices" card (was showing calculated fake data: `revenueYTD * 0.05`)
  - Removed "Outstanding Balance" card with non-functional "Generate Statement" button
  - Removed "View Drafts" button that had no action
  - Removed "View All QuickBooks" link that went nowhere (`href="#"`)
- **Unknown Client Display**: Improved payment table display for transactions without client names
  - Now shows descriptive labels: "Bank Deposit", "Sales Receipt", or "Payment" instead of "Unknown Client"
  - Shows account name as secondary info when available
- **Metric Labels**: Changed metric card titles to include the date filter directly
  - "Payments (Year to Date)" instead of generic title with subValue
  - "Total Collected (Year to Date)" instead of "Total Payments Collected"
  - "Avg Payment (Year to Date)" instead of "Avg Case Value"
  - Removed confusing subValue labels that weren't updating properly

### Removed
- **Non-functional UI Elements**:
  - "Download Report" button from Overview page (no action)
  - External link button from "Cases Needing Attention" items (no action)
  - Sidebar cards from Bookkeeping page (fake data, non-functional buttons)

### Changed
- Bookkeeping payments table now uses full width (removed sidebar layout)
- Cleaned up unused imports and variables in bookkeeping and overview pages

---

## [1.2.3] - 2026-02-18

### Fixed
- **"Unknown Client" in QB Transactions**: Fixed extraction of client names from QuickBooks deposits
  - Deposits store client info in `Line[].DepositLineDetail.Entity.name` not `CustomerRef`
  - Now checks multiple locations: CustomerRef, Line items, EntityRef, Memo fields
  - Falls back to "Client Payment" with reference number if no name found

### Changed
- **All Metrics Connected to Date Filter**: Every metric across all pages now respects the global date filter
  - Bookkeeping: Closed Cases, Total Payments Collected, Avg Case Value all filter by date
  - Metrics: Total Collected, Avg Case Value, Leads, Consultations all filter by date
  - Removed hardcoded "Weekly Total" and "This Week" labels - now show selected filter label

### Technical
- Simplified QB metrics calculation - removed server-side weekly calculations
- Frontend now calculates all period metrics from transaction data
- Added Clio custom fields debug endpoint (`/api/debug/test-clio`) for field ID discovery

---

## [1.2.2] - 2026-02-18

### Fixed
- **Hardcoded Values Removed**: Bookkeeping page now shows real data instead of hardcoded placeholders
  - "Draft Invoices" now calculates from actual QB revenue data
  - "Outstanding Balance" now pulls from Clio case management data
- **Sync Error Visibility**: Errors from Clio, QuickBooks, and GHL are now properly logged and visible
  - Each integration now logs detailed errors to the system logs
  - Token validation errors are surfaced with specific messages
  - Missing realmId/locationId errors now show reconnection instructions
- **QuickBooks Token Refresh**: Increased refresh buffer from 5 to 10 minutes
  - QB tokens only last 1 hour, previous 5-minute buffer was cutting it too close
- **Debug Endpoint Bug**: Fixed token expiration check in `/api/debug/test-clio`
  - Was comparing Unix seconds to JS milliseconds (wrong by 1000x)
- **Clio Scope Resilience**: Made Clio connector work even with limited OAuth scopes
  - Removed dependency on `who_am_i` endpoint (requires `users:read` scope)
  - Fetch matters with minimal fields first, then try billing separately
  - Handle 403/400 errors gracefully for calendar, bills, and closed matters
  - Falls back to matters endpoint for connection verification

### Added
- **Comprehensive Sync Test**: New `/api/debug/sync-test` endpoint
  - Tests each integration step-by-step with detailed results
  - Shows exact errors for each service
  - Includes sample data from successful API calls
  - Use this to diagnose why integrations aren't returning data

### Technical
- Added detailed console logging for token refresh status
- Added warning logs when APIs return empty data (0 cases, $0 revenue)
- All sync errors now stored in `syncErrors` object and logged to database

---

## [1.2.1] - 2026-02-13

### Fixed
- **QuickBooks OAuth Connection**: Fixed client_id typo preventing OAuth
  - Corrected single character typo: `JFlBc` → `JFllBc` (missing 'l')
  - Updated to Production app credentials
  - Rotated client secret

---

## [1.2.0] - 2026-01-22

### Added
- **Global Date Filter**: Added date range filter across all dashboard pages
  - Dropdown in header with predefined ranges: Today, This Week, This Month, This Quarter, Year to Date
  - Custom date range picker for specific date ranges
  - All pages (Dashboard, Leads, Cases) filter data based on selected range
- **QuickBooks Debug Endpoint**: `/api/debug/test-qb` for testing QuickBooks OAuth connection

### Fixed
- **GHL Consultation Metrics**: Fixed `consultsScheduled` counting ALL open opportunities instead of just consultation-stage ones
  - Now only counts opportunities with pipeline stages containing "consult", "scheduled", "booked", or "appointment"
  - Added `consultationsWeekly` metric for weekly consultation tracking
  - Added `openOpportunities` metric for total open opportunity count
  - Added stage distribution logging for debugging

### Changed
- Dashboard, Leads, and Cases pages now use date-filtered data
- Metric card titles now reflect the selected date range (e.g., "Cases (This Week)")
- Footer changed from hardcoded date to "ExecView v1.0"

### Technical
- Added `DateFilterContext` for global date state management
- Added `DateFilterDropdown` component with custom date picker
- Added `isInRange` utility function for date filtering across components

---

## [1.1.2] - 2025-01-22

### Critical Fixes
- **GHL API Version Header**: Fixed GoHighLevel API calls using wrong version header (`2021-07-28` → `2021-04-15`)
  - Both `client.ts` and `enhanced-client.ts` were using incorrect version
  - This was causing opportunities API to return 0 results despite 62 opportunities existing
- **Metrics Page Conversion Rate**: Fixed display showing 1550% instead of 15.5% (was multiplying already-calculated percentage by 100)
- **Cases Page Date**: Fixed hardcoded date `2025-12-23` replaced with `new Date()` for proper court date urgency calculation

### Changed
- **GHLMetric Type Consistency**: Updated all GHL data sources to return consistent shape with `lead`, `stage`, `totalOpportunities`, `totalContacts`, `closeRate` fields
- **Mock Data**: Updated mock data to match GHLMetric interface for type safety

### Technical
- Updated API version headers in both GHL connectors
- All opportunity feeds now include both `lead`/`stage` and `contactName`/`pipelineStage` for backward compatibility

---

## [1.1.1] - 2025-01-22

### Critical Fixes
- **GHL OAuth locationId**: Fixed OAuth callback to capture `locationId` (was looking for wrong case)
- **Admin Sync Button**: Fixed "Sync All Sources" button - was fake (just waited 2 seconds, did nothing)

### Root Cause
Database investigation revealed GHL `realm_id` (locationId) was NULL, causing all GHL API calls to fail with "Missing location ID" error.

---

## [1.1.0] - 2025-01-22

### Critical Fixes
- **QuickBooks Production URL**: Fixed critical bug where QuickBooks was hitting sandbox API instead of production
- **Clio Custom Field IDs**: Updated to use hardcoded field IDs instead of fragile string matching

### Added
- **Automatic Token Refresh**: All three integrations (Clio, GoHighLevel, QuickBooks) now automatically refresh expired tokens
  - Tokens are refreshed 5 minutes before expiration
  - Failed refresh prompts user to reconnect
- **GHL Webhook Setup Guide**: Added comprehensive documentation at `docs/GHL_WEBHOOK_SETUP.md`

### Changed
- **Clio Field Mapping**: Now uses hardcoded field IDs for Shahnam's account:
  - Plea Offer Received (16937551)
  - Discovery Received (16937566)
  - Next Court Date (16937581)
  - Next Court Hearing (16937596)
  - Charge Type (16577596)
  - Custody Status (16573291)
  - Case Number (16592671)
  - Plea Offer Details (16937536)
- Falls back to string matching for other accounts

### Technical
- Added `src/lib/tokenRefresh.ts` - Centralized token refresh utility
- Updated `dbActions.ts` to use automatic token refresh before API calls
- Updated `ghl-service.ts` to use automatic token refresh

---

## [1.0.0] - 2025-01-13

### Summary
Production-ready release of ExecView - a comprehensive executive reporting dashboard for law firms that integrates with Clio, GoHighLevel, and QuickBooks.

### Added
- **Complete OAuth Integration** for all three services (Clio, GoHighLevel, QuickBooks)
- **Session-Based Authentication** with HTTP-only cookies and secure token management
- **Real-time Data Synchronization** with GoHighLevel webhooks
- **Comprehensive Dashboard Pages**:
  - Overview Dashboard with KPIs
  - Case Management (Clio integration)
  - Bookkeeping (QuickBooks integration)
  - Leads Tracking (GoHighLevel integration)
  - Firm Metrics (aggregated analytics)
  - Admin Panel for system management
- **PDF Report Generation** for weekly automated reports
- **Metrics Engine** for comprehensive business intelligence calculations
- **Caching System** with database-backed TTL for performance
- **Scheduled Sync Jobs** (daily at 6 AM EST)
- **Comprehensive Documentation** (System, Deployment, Testing guides)

### Changed
- Migrated from Supabase to Neon PostgreSQL database
- Implemented password-only authentication for single-firm system
- Removed obsolete field mapping UI (replaced with zero-configuration integrations)
- Enhanced GoHighLevel integration with full database persistence

### Technical Stack
- Next.js 16.1.1 with App Router
- React 19.2.3
- TypeScript 5.9.3
- Tailwind CSS 4.1.18
- Prisma 5.10.2 ORM
- Neon PostgreSQL
- Vercel Deployment

### Security
- HTTP-only cookies for XSS protection
- bcryptjs password hashing
- OAuth 2.0 with proper scope management
- CSRF protection with SameSite cookies
- SQL injection prevention via Prisma

---

## Development History

### [0.9.0] - 2025-01-09
- Complete Neon PostgreSQL database integration
- Session-based authentication system

### [0.8.0] - 2025-01-08
- Enhanced GoHighLevel integration with real-time webhook processing
- Database persistence for GHL data

### [0.7.0] - 2025-01-06
- Complete Clio integration with enhanced API client
- GHL OAuth integration with metrics calculation

### [0.6.0] - 2025-01-05
- Vercel deployment conversion
- Build error fixes and TypeScript compliance

### [0.5.0] - 2025-01-04
- Single-firm intelligent metrics system
- Comprehensive test configuration

### [0.4.0] - 2024-12-30
- OAuth instructions and setup documentation
- Field mapping dropdown autocomplete

---

## Deployment

**Production URL:** https://execview.vercel.app
**Status:** Live and Operational
**Last Deployment:** January 13, 2025
