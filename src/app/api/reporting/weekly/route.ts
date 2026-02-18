import { NextResponse } from 'next/server';
import { getProfile, addLog, getSystemSetting, getCachedData } from '@/lib/dbActions';
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

        const profile = await getProfile();

        if (!profile || (!profile.email && !toOverride)) {
            return NextResponse.json({ message: 'No profile/email found — cannot send report' }, { status: 400 });
        }

        const schedule = await getSystemSetting('reporting_schedule');
        if (schedule && schedule.enabled === false) {
            return NextResponse.json({ message: 'Reporting is disabled in settings' });
        }

        // ── Fetch real metrics from cache ─────────────────────────────────────
        const firmMetrics = await getCachedData();

        if (!firmMetrics) {
            await addLog('EmailSystem', 'error', 'Weekly report: no cached metrics found — run a sync first');
            return NextResponse.json({ error: 'No cached metrics available. Run a sync first.' }, { status: 503 });
        }

        const { ghl, qb } = firmMetrics;

        // ── Conversion rates ─────────────────────────────────────────────────
        // conversionRate and closeRate come from GHL as percentages
        const consultsPerLeadRate = typeof ghl.conversionRate === 'number' ? ghl.conversionRate : 0;
        const retainersPerConsultRate = typeof ghl.closeRate === 'number' ? ghl.closeRate : 0;

        // ── Marketing ROI ─────────────────────────────────────────────────────
        const adSpendYTD = qb.adSpendYTD ?? 0;
        const feesCollectedYTD = qb.revenueYTD ?? 0;
        const roiPercent = adSpendYTD > 0
            ? ((feesCollectedYTD - adSpendYTD) / adSpendYTD) * 100
            : 0;
        const retainersSigned = ghl.retainersSigned ?? firmMetrics.newCasesSignedYTD ?? 1;
        const costPerAcquisition = retainersSigned > 0 ? adSpendYTD / retainersSigned : 0;

        // ── Lead sources — filter to known sources only ───────────────────────
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
        // Also include any remaining sources not in the known list
        for (const [src, cnt] of Object.entries(rawSources)) {
            if (!knownSources.includes(src) && cnt > 0) {
                leadSources[src] = cnt;
            }
        }

        // ── Assemble email payload ─────────────────────────────────────────────
        const { weekRange, yearLabel } = getWeekRange();

        const emailData: WeeklyReportEmailData = {
            firmName: profile.firmName || 'My Firm',
            userName: profile.name || 'Team',
            weekRange,
            yearLabel,

            revenueWeekly: qb.paymentsCollectedWeekly ?? 0,
            revenueYTD: feesCollectedYTD,

            leadsWeekly: ghl.leadsWeekly ?? 0,
            leadsYTD: ghl.leadsYTD ?? 0,

            consultsPerLeadRate,
            retainersPerConsultRate,

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
        const result = await sendWeeklyFirmReport(profile.email, emailData);

        if (!result.success) {
            await addLog('EmailSystem', 'error', `Weekly report send failed: ${result.error}`);
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        await addLog(
            'EmailSystem',
            'success',
            `Weekly firm metrics report sent to ${profile.email} (Resend ID: ${result.id})`
        );

        return NextResponse.json({
            message: 'Weekly report sent successfully',
            resendId: result.id,
            sentTo: profile.email,
            weekRange,
        });

    } catch (error: any) {
        console.error('Weekly report error:', error);
        await addLog('EmailSystem', 'error', `Weekly report exception: ${error.message}`).catch(() => {});
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
