import { NextResponse } from 'next/server';
import { getProfileForSystem, addLog, getSystemSetting, getCachedDataForSystem } from '@/lib/dbActions';
import { sendWeeklyFirmReport, WeeklyReportEmailData } from '@/lib/resendEmail';

// ── Compute the most recent Mon–Sun week range label ──────────────────────────
function getWeekRange(): { weekRange: string; yearLabel: string } {
    const now = new Date();
    const day = now.getDay(); // 0 = Sun, 1 = Mon …
    const diffToLastMon = day === 0 ? 6 : day - 1;
    const lastMon = new Date(now);
    lastMon.setDate(now.getDate() - diffToLastMon - 7);
    const lastSun = new Date(lastMon);
    lastSun.setDate(lastMon.getDate() + 6);

    const fmt = (d: Date) =>
        d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return {
        weekRange: `${fmt(lastMon)} – ${fmt(lastSun)}, ${lastSun.getFullYear()}`,
        yearLabel: lastSun.getFullYear().toString(),
    };
}

export async function POST(request: Request) {
    try {
        // Optional body: { to?: string } — overrides the profile email
        let toOverride: string | undefined;
        try {
            const body = await request.json();
            if (typeof body?.to === 'string' && body.to.includes('@')) toOverride = body.to;
        } catch { /* no body or non-JSON — that's fine */ }

        const profile = await getProfileForSystem();

        if (!toOverride && (!profile || !profile.email)) {
            return NextResponse.json({ message: 'No profile/email found — cannot send report' }, { status: 400 });
        }

        const schedule = await getSystemSetting('reporting_schedule');
        if (schedule && schedule.enabled === false) {
            return NextResponse.json({ message: 'Reporting is disabled in settings' });
        }

        // ── Fetch real metrics from cache ─────────────────────────────────────
        const firmMetrics = await getCachedDataForSystem();

        if (!firmMetrics) {
            await addLog('EmailSystem', 'error', 'Weekly report: no cached metrics found — run a sync first');
            return NextResponse.json({ error: 'No cached metrics available. Run a sync first.' }, { status: 503 });
        }

        const { ghl, qb } = firmMetrics;

        // ── Revenue this week — sum QB transactions in last 7 days ───────────
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const transactions: Array<{ date: string; amount: number }> = qb.transactions ?? [];
        const revenueWeekly = transactions
            .filter(t => new Date(t.date) >= sevenDaysAgo)
            .reduce((sum, t) => sum + (t.amount ?? 0), 0);

        // ── Conversion rates ─────────────────────────────────────────────────
        // ghl.conversionRate = won / total leads  → "Lead → Retainer" rate
        // ghl.closeRate      = won / (won + lost) → "Close Rate" (out of decided deals)
        const leadToRetainerRate = typeof ghl.conversionRate === 'number' ? ghl.conversionRate : 0;
        const closeRate = typeof ghl.closeRate === 'number' ? ghl.closeRate : 0;

        // ── Marketing ROI ─────────────────────────────────────────────────────
        const adSpendYTD = qb.adSpendYTD ?? 0;
        const feesCollectedYTD = qb.revenueYTD ?? 0;
        const roiPercent = adSpendYTD > 0
            ? ((feesCollectedYTD - adSpendYTD) / adSpendYTD) * 100
            : 0;
        const retainersSigned = ghl.retainersSigned ?? firmMetrics.newCasesSignedYTD ?? 1;
        const costPerAcquisition = retainersSigned > 0 ? adSpendYTD / retainersSigned : 0;

        // ── Lead sources — filter to known sources only ───────────────────────
        // Only include recognised marketing channels; skip phone-system artifacts
        // (call_made, name via lookup, couldn't find caller name, etc.)
        const knownSources = ['Google LSA', 'Social Media', 'Website/SEO', 'Google Business Profile', 'Referral', 'Referrals'];
        const rawSources = ghl.leadSources ?? {};
        const leadSources: Record<string, number> = {};
        for (const src of knownSources) {
            if (rawSources[src] !== undefined && rawSources[src] > 0) {
                // Normalise "Referral" / "Referrals" → "Referrals"
                const key = src === 'Referral' ? 'Referrals' : src;
                leadSources[key] = (leadSources[key] ?? 0) + rawSources[src];
            }
        }

        // ── Assemble email payload ─────────────────────────────────────────────
        const { weekRange, yearLabel } = getWeekRange();

        const emailData: WeeklyReportEmailData = {
            firmName: profile?.firmName || 'My Firm',
            userName: profile?.name || 'Team',
            weekRange,
            yearLabel,

            revenueWeekly,
            revenueYTD: feesCollectedYTD,

            leadsWeekly: ghl.leadsWeekly ?? 0,
            leadsYTD: ghl.leadsYTD ?? 0,

            consultsPerLeadRate: leadToRetainerRate,
            retainersPerConsultRate: closeRate,

            adSpendYTD,
            feesCollectedYTD,
            roiPercent,
            costPerAcquisition,

            leadSources,

            newCasesWeekly: firmMetrics.newCasesSignedWeekly ?? 0,
            newCasesYTD: firmMetrics.newCasesSignedYTD ?? 0,

            activeCases: firmMetrics.activeCases ?? 0,
        };

        // ── Send via Resend ────────────────────────────────────────────────────
        const sendTo = toOverride || profile?.email!;
        const result = await sendWeeklyFirmReport(sendTo, emailData);

        if (!result.success) {
            await addLog('EmailSystem', 'error', `Weekly report send failed: ${result.error}`);
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        await addLog(
            'EmailSystem',
            'success',
            `Weekly firm metrics report sent to ${sendTo} (Resend ID: ${result.id})`
        );

        return NextResponse.json({
            message: 'Weekly report sent successfully',
            resendId: result.id,
            sentTo: sendTo,
            weekRange,
        });

    } catch (error: any) {
        console.error('Weekly report error:', error);
        await addLog('EmailSystem', 'error', `Weekly report exception: ${error.message}`).catch(() => {});
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
