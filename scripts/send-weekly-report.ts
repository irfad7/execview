/**
 * Standalone script — sync metrics from Clio/GHL/QB, then send the weekly
 * firm metrics report via Resend.
 *
 * Usage:  npx tsx scripts/send-weekly-report.ts [recipient@email.com]
 */

// Load .env.local before anything else
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import { generateFirmMetricsEmailHtml, WeeklyReportEmailData } from '../src/components/email/FirmMetricsEmail';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

// ── Week range (last Mon–Sun) ─────────────────────────────────────────────────
function getWeekRange() {
    const now = new Date();
    const day = now.getDay();
    const diffToLastMon = day === 0 ? 6 : day - 1;
    const lastMon = new Date(now);
    lastMon.setDate(now.getDate() - diffToLastMon - 7);
    const lastSun = new Date(lastMon);
    lastSun.setDate(lastMon.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
        weekRange: `${fmt(lastMon)} – ${fmt(lastSun)}, ${lastSun.getFullYear()}`,
        yearLabel: lastSun.getFullYear().toString(),
    };
}

async function main() {
    const recipientArg = process.argv[2];

    try {
        // ── 1. Find the user ─────────────────────────────────────────────────
        const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
        if (!user) throw new Error('No user found in database');
        console.log(`User: ${user.email}`);

        // ── 2. Load profile ─────────────────────────────────────────────────
        const profile = await prisma.profile.findFirst({ where: { userId: user.id } });
        const firmName = profile?.firmName || 'My Firm';
        const userName = profile?.name || 'Team';
        const profileEmail = profile?.email || user.email;
        const sendTo = recipientArg || profileEmail;
        console.log(`Sending to: ${sendTo}`);

        // ── 3. Pull cached metrics ────────────────────────────────────────────
        const cache = await prisma.dashboardCache.findFirst({
            where: { userId: user.id, cacheKey: 'dashboard_metrics' },
            orderBy: { updatedAt: 'desc' },
        });

        if (!cache) {
            throw new Error('No cached metrics found. Please run a sync from the dashboard first.');
        }

        const metrics = JSON.parse(cache.cacheData);
        const updatedAt = cache.updatedAt.toLocaleString('en-US', { timeZone: 'America/New_York' });
        console.log(`Cache last updated: ${updatedAt} ET`);

        const { ghl, qb } = metrics;

        // ── 4. Derive email data ─────────────────────────────────────────────
        const adSpendYTD = qb?.adSpendYTD ?? 0;
        const feesCollectedYTD = qb?.revenueYTD ?? 0;
        const roiPercent = adSpendYTD > 0 ? ((feesCollectedYTD - adSpendYTD) / adSpendYTD) * 100 : 0;
        const retainersSigned = ghl?.retainersSigned ?? metrics.newCasesSignedYTD ?? 1;
        const costPerAcquisition = retainersSigned > 0 ? adSpendYTD / retainersSigned : 0;

        // Normalise lead sources
        const knownSources = ['Google LSA', 'Social Media', 'Website/SEO', 'Google Business Profile', 'Referral', 'Referrals'];
        const rawSources: Record<string, number> = ghl?.leadSources ?? {};
        const leadSources: Record<string, number> = {};
        for (const src of knownSources) {
            if (rawSources[src] > 0) {
                const key = src === 'Referral' ? 'Referrals' : src;
                leadSources[key] = (leadSources[key] ?? 0) + rawSources[src];
            }
        }
        for (const [src, cnt] of Object.entries(rawSources)) {
            if (!knownSources.includes(src) && (cnt as number) > 0) leadSources[src] = cnt as number;
        }

        const { weekRange, yearLabel } = getWeekRange();

        const emailData: WeeklyReportEmailData = {
            firmName,
            userName,
            weekRange,
            yearLabel,
            revenueWeekly: qb?.paymentsCollectedWeekly ?? 0,
            revenueYTD: feesCollectedYTD,
            leadsWeekly: ghl?.leadsWeekly ?? 0,
            leadsYTD: ghl?.leadsYTD ?? 0,
            consultsPerLeadRate: ghl?.conversionRate ?? 0,
            retainersPerConsultRate: ghl?.closeRate ?? 0,
            adSpendYTD,
            feesCollectedYTD,
            roiPercent,
            costPerAcquisition,
            leadSources,
            newCasesWeekly: metrics.newCasesSignedWeekly ?? 0,
            newCasesYTD: metrics.newCasesSignedYTD ?? 0,
            activeCases: metrics.activeCases ?? 0,
        };

        // ── 5. Log what we're sending ────────────────────────────────────────
        console.log('\n── Metrics snapshot ──────────────────────────────');
        console.log(`  Revenue     Weekly: $${emailData.revenueWeekly.toLocaleString()}  YTD: $${emailData.revenueYTD.toLocaleString()}`);
        console.log(`  Leads       Weekly: ${emailData.leadsWeekly}  YTD: ${emailData.leadsYTD}`);
        console.log(`  Consults/Leads:     ${emailData.consultsPerLeadRate.toFixed(1)}%`);
        console.log(`  Retainers/Consults: ${emailData.retainersPerConsultRate.toFixed(1)}%`);
        console.log(`  Ad Spend YTD:       $${emailData.adSpendYTD.toLocaleString()}`);
        console.log(`  Fees YTD:           $${emailData.feesCollectedYTD.toLocaleString()}`);
        console.log(`  ROI:                ${emailData.roiPercent.toFixed(1)}%`);
        console.log(`  CPA:                $${emailData.costPerAcquisition.toLocaleString()}`);
        console.log(`  New Cases   Weekly: ${emailData.newCasesWeekly}  YTD: ${emailData.newCasesYTD}`);
        console.log(`  Active Cases:       ${emailData.activeCases}`);
        console.log(`  Lead Sources:       ${JSON.stringify(leadSources)}`);
        console.log('──────────────────────────────────────────────────\n');

        // ── 6. Send via Resend ───────────────────────────────────────────────
        const from = process.env.RESEND_FROM_EMAIL || 'reports@updates.mylegalacademy.com';
        const { data, error } = await resend.emails.send({
            from: `${firmName} Reports <${from}>`,
            to: [sendTo],
            subject: `Weekly Firm Metrics — ${weekRange}`,
            html: generateFirmMetricsEmailHtml(emailData),
        });

        if (error) throw new Error(`Resend error: ${error.message}`);

        console.log(`✓ Email sent successfully!`);
        console.log(`  Resend ID: ${data?.id}`);
        console.log(`  To:        ${sendTo}`);
        console.log(`  Subject:   Weekly Firm Metrics — ${weekRange}`);

    } finally {
        await prisma.$disconnect();
    }
}

main().catch((err) => {
    console.error('✗ Failed:', err.message);
    prisma.$disconnect();
    process.exit(1);
});
