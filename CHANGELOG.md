# Changelog

All notable changes to ExecView - Executive Law Firm Dashboard.

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
