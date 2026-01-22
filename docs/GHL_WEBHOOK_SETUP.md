# GoHighLevel Webhook & Workflow Setup Guide

## Overview

This guide explains how to set up GoHighLevel (GHL) to send data to ExecView for real-time dashboard updates.

**Webhook URL:** `https://execview.vercel.app/api/webhooks/gohighlevel`

---

## Understanding the Webhook Architecture

### Yes, All Webhooks Go to the SAME URL

This is actually the **correct pattern**. Here's why:

1. GHL sends different **event types** with each webhook (e.g., `ContactCreate`, `OpportunityUpdate`)
2. The event type is included in the `x-ghl-event-type` HTTP header
3. Our webhook handler reads this header and routes to the appropriate handler
4. Each webhook payload also contains a `locationId` to identify which GHL account it came from

### Supported Event Types

| Event Type | Trigger | What ExecView Does |
|------------|---------|-------------------|
| `ContactCreate` | New contact added | Syncs contact to database |
| `ContactUpdate` | Contact info changed | Updates contact in database |
| `ContactDelete` | Contact removed | Soft-deletes contact |
| `OpportunityCreate` | New opportunity created | Syncs opportunity to database |
| `OpportunityUpdate` | Opportunity details changed | Updates opportunity |
| `OpportunityStatusUpdate` | Pipeline stage changed | Updates status in database |
| `OpportunityDelete` | Opportunity removed | Soft-deletes opportunity |

---

## Method 1: Using GHL Workflows (Recommended)

Workflows give you fine-grained control over when webhooks are sent.

### Workflow 1: New Lead Notification

**Trigger:** Contact Created

**Steps:**
1. Go to **Automation** → **Workflows**
2. Click **Create Workflow** → **Start from Scratch**
3. Name it: `ExecView - New Contact Sync`
4. **Add Trigger:** Contact Created
5. **Add Action:** Webhook
   - URL: `https://execview.vercel.app/api/webhooks/gohighlevel`
   - Method: POST
   - Headers:
     - `Content-Type`: `application/json`
     - `x-ghl-event-type`: `ContactCreate`
   - Body: Include all contact fields (use merge fields)
6. **Save & Publish**

### Workflow 2: Contact Updated

**Trigger:** Contact Changed

**Steps:**
1. Create new workflow: `ExecView - Contact Update Sync`
2. **Add Trigger:** Contact Tag Added OR Contact Field Updated
3. **Add Action:** Webhook
   - URL: `https://execview.vercel.app/api/webhooks/gohighlevel`
   - Method: POST
   - Headers:
     - `x-ghl-event-type`: `ContactUpdate`
   - Body: Include contact data

### Workflow 3: New Opportunity

**Trigger:** Opportunity Created

**Steps:**
1. Create workflow: `ExecView - New Opportunity Sync`
2. **Add Trigger:** Pipeline Stage Changed → Trigger on "New" or first stage
3. **Add Action:** Webhook
   - URL: `https://execview.vercel.app/api/webhooks/gohighlevel`
   - Headers:
     - `x-ghl-event-type`: `OpportunityCreate`

### Workflow 4: Opportunity Stage Changed (MOST IMPORTANT)

This tracks leads through your pipeline.

**Steps:**
1. Create workflow: `ExecView - Opportunity Status Sync`
2. **Add Trigger:** Pipeline Stage Changed (Any Stage)
3. **Add Action:** Webhook
   - URL: `https://execview.vercel.app/api/webhooks/gohighlevel`
   - Headers:
     - `x-ghl-event-type`: `OpportunityStatusUpdate`

### Workflow 5: Opportunity Won/Lost

**Steps:**
1. Create workflow: `ExecView - Opportunity Closed Sync`
2. **Add Trigger:** Opportunity Status Changed (Won or Lost)
3. **Add Action:** Webhook
   - URL: `https://execview.vercel.app/api/webhooks/gohighlevel`
   - Headers:
     - `x-ghl-event-type`: `OpportunityUpdate`

---

## Method 2: Using GHL Webhooks (Simpler but Less Control)

GHL has a built-in webhook feature that automatically sends events.

### Steps:

1. Go to **Settings** → **Webhooks** (or **API & Webhooks**)
2. Click **Add Webhook**
3. Configure:
   - **Name:** ExecView Integration
   - **URL:** `https://execview.vercel.app/api/webhooks/gohighlevel`
   - **Events:** Select all relevant events:
     - ✅ Contact Created
     - ✅ Contact Updated
     - ✅ Contact Deleted
     - ✅ Opportunity Created
     - ✅ Opportunity Updated
     - ✅ Opportunity Deleted
     - ✅ Opportunity Status Changed
4. **Save**

**Note:** This method sends webhooks for ALL events. The workflow method lets you filter which events trigger webhooks.

---

## Webhook Payload Structure

### Contact Events
```json
{
  "id": "contact_id_here",
  "locationId": "your_location_id",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "source": "Website Form",
  "tags": ["lead", "website"],
  "dateAdded": "2025-01-15T10:30:00Z"
}
```

### Opportunity Events
```json
{
  "id": "opportunity_id_here",
  "locationId": "your_location_id",
  "name": "John Doe - DUI Case",
  "status": "open",
  "pipelineId": "pipeline_id",
  "pipelineStageId": "stage_id",
  "contactId": "contact_id",
  "monetaryValue": 5000,
  "source": "Website",
  "dateCreated": "2025-01-15T10:30:00Z"
}
```

---

## Recommended Workflows for Law Firm

### Essential Workflows (Must Have)

1. **New Lead Alert**
   - Trigger: Contact Created
   - Webhook: `ContactCreate`

2. **Pipeline Movement**
   - Trigger: Opportunity Stage Changed
   - Webhook: `OpportunityStatusUpdate`

3. **Consultation Booked**
   - Trigger: Appointment Booked
   - Webhook: `OpportunityUpdate`

4. **Retainer Signed**
   - Trigger: Opportunity Won
   - Webhook: `OpportunityUpdate`

### Nice-to-Have Workflows

5. **Lead Source Tracking**
   - Trigger: Contact Tag Added (by source)
   - Webhook: `ContactUpdate`

6. **No Response Follow-up**
   - Trigger: Contact has no activity for X days
   - Webhook: `ContactUpdate` (with tag)

---

## Testing Your Webhooks

### Step 1: Check Webhook Receipt

After setting up, trigger an event (create a test contact) and check:

1. Go to ExecView Admin panel
2. Look at system logs
3. Should see: `Received GHL webhook: ContactCreate`

### Step 2: Verify Data Sync

1. Create a test contact in GHL
2. Wait 1-2 seconds
3. Check ExecView Leads dashboard
4. Contact should appear

### Step 3: Check Database (Advanced)

```bash
# View recent webhooks
SELECT * FROM "GHLWebhook" ORDER BY "createdAt" DESC LIMIT 10;

# Check if processed
SELECT id, "eventType", processed, "errorMessage" FROM "GHLWebhook";
```

---

## Troubleshooting

### Webhooks Not Arriving

1. **Check URL:** Must be exactly `https://execview.vercel.app/api/webhooks/gohighlevel`
2. **Check locationId:** Must match what's stored in ExecView from OAuth
3. **Check GHL logs:** Go to workflow history to see if webhook fired

### Webhooks Arriving but Not Processing

1. **Check error message:** Look in GHLWebhook table for `errorMessage`
2. **Common issue:** OAuth token expired - reconnect GHL integration

### Data Not Showing on Dashboard

1. Webhooks update the database, but dashboard reads from cache
2. Cache invalidation should happen automatically
3. If stale, trigger manual sync from Admin panel

---

## Important Notes

1. **locationId is Critical:** The webhook payload MUST include `locationId` that matches your OAuth connection

2. **OAuth Must Be Connected First:** Before webhooks work, you must connect GHL via the Integrations page

3. **One Webhook URL for All Events:** This is intentional - the system routes based on event type

4. **Real-time vs Batch:** Webhooks provide real-time updates. Daily sync (6 AM EST) provides full reconciliation.

---

## Quick Setup Checklist

- [ ] Connect GHL OAuth on `/integrations` page
- [ ] Note your locationId from the connection
- [ ] Go to GHL Settings → Webhooks
- [ ] Add webhook URL: `https://execview.vercel.app/api/webhooks/gohighlevel`
- [ ] Enable Contact and Opportunity events
- [ ] Create a test contact
- [ ] Verify it appears in ExecView
- [ ] Set up workflows for pipeline tracking (optional but recommended)
