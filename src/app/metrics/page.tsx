"use client";

import { useMemo } from "react";
import { useDashboard } from "@/lib/context";
import { useDateFilter } from "@/lib/dateFilterContext";
import { Header } from "@/components/Header";
import { MetricCard } from "@/components/Card";
import {
    Users,
    Target,
    TrendingUp,
    BarChart,
    Download,
    DollarSign,
    Percent,
    Briefcase,
    Star
} from "lucide-react";
import { PageTransition, AnimatedCard } from "@/lib/animations";
import { exportToPdf } from "@/lib/pdfUtils";

const LEAD_SOURCE_COLORS = [
    "bg-primary",
    "bg-success",
    "bg-warning",
    "bg-purple-500",
    "bg-pink-500",
    "bg-cyan-500",
];

export default function MetricsPage() {
    const { data, loading } = useDashboard();
    const { filter, isInRange } = useDateFilter();

    if (loading || !data) {
        return (
            <div className="flex-1 flex flex-col">
                <Header title="Firm Metrics" />
                <div className="p-8">
                    <div className="h-64 bg-sidebar-accent animate-pulse rounded-2xl" />
                </div>
            </div>
        );
    }

    // --- Revenue ---
    const revenueYTD = data.qb?.revenueYTD || 0;
    const adSpendYTD = data.qb?.adSpendYTD || 0;

    // Filter QB transactions by selected date range for period revenue
    const filteredTransactions = useMemo(() => {
        return (data?.qb?.transactions || []).filter(txn => {
            if (!txn.date) return true;
            return isInRange(txn.date);
        });
    }, [data?.qb?.transactions, isInRange]);

    const revenueInPeriod = useMemo(() =>
        filteredTransactions.reduce((sum, t) => sum + t.amount, 0),
        [filteredTransactions]
    );

    // --- Leads & Conversion ---
    const allLeads = useMemo(() => {
        return (data?.ghl?.opportunityFeed || []).filter(lead => {
            if (!lead.date) return true;
            const parts = lead.date.split('/');
            if (parts.length === 3) {
                const d = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
                return isInRange(d);
            }
            return true;
        });
    }, [data?.ghl?.opportunityFeed, isInRange]);

    const leadsInPeriod = allLeads.length;

    const consultsInPeriod = useMemo(() =>
        allLeads.filter(l =>
            l.stage?.toLowerCase().includes('consult') ||
            l.stage?.toLowerCase().includes('scheduled') ||
            l.stage?.toLowerCase().includes('booked')
        ).length,
        [allLeads]
    );

    const retainersInPeriod = useMemo(() =>
        allLeads.filter(l =>
            l.stage?.toLowerCase().includes('retainer') ||
            l.stage?.toLowerCase().includes('signed') ||
            l.stage?.toLowerCase().includes('hired')
        ).length,
        [allLeads]
    );

    // Conversion rates
    const consultRate = leadsInPeriod > 0
        ? ((consultsInPeriod / leadsInPeriod) * 100).toFixed(1)
        : "0.0";
    const retainerRate = consultsInPeriod > 0
        ? ((retainersInPeriod / consultsInPeriod) * 100).toFixed(1)
        : "0.0";

    // --- Marketing ROI & CPA ---
    // ROI = Revenue / Ad Spend (using period revenue vs YTD ad spend as best approximation)
    const roiMultiple = adSpendYTD > 0
        ? (revenueYTD / adSpendYTD).toFixed(1)
        : null;
    const roiPercent = adSpendYTD > 0
        ? Math.round(((revenueYTD - adSpendYTD) / adSpendYTD) * 100)
        : null;
    const cpa = retainersInPeriod > 0 && adSpendYTD > 0
        ? Math.round(adSpendYTD / retainersInPeriod)
        : null;

    // --- Lead Sources ---
    const leadSources = data.ghl?.leadSources || {};
    const totalSourceLeads = Object.values(leadSources).reduce((s, v) => s + v, 0) || 1;

    // --- Cases ---
    const activeCases = (data.clio || []).length;
    const newCasesSignedYTD = data.newCasesSignedYTD || data.ghl?.retainersSigned || 0;

    return (
        <PageTransition>
            <div className="flex-1 flex flex-col">
                <Header title="Firm Performance Analytics" />

                <main className="p-8 space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground font-display tracking-tight">Firm Metrics</h2>
                            <p className="text-sidebar-foreground text-sm font-medium">
                                All metrics shown for: <span className="text-foreground font-bold">{filter.label}</span>
                            </p>
                        </div>
                        <button
                            onClick={() => exportToPdf('metrics-content', 'Firm_Metrics_Report')}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl font-bold hover:bg-primary/20 transition-all text-sm"
                        >
                            <Download className="w-4 h-4" />
                            Export PDF
                        </button>
                    </div>

                    <div id="metrics-content" className="space-y-8">

                        {/* ── Section 1: Revenue ── */}
                        <section>
                            <h3 className="text-xs font-black uppercase tracking-widest text-sidebar-foreground mb-4">Revenue</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <AnimatedCard delay={0.05}>
                                    <MetricCard
                                        title={`Revenue (${filter.label})`}
                                        value={revenueInPeriod > 0 ? `$${Math.round(revenueInPeriod).toLocaleString()}` : "$0"}
                                        icon={<DollarSign className="w-4 h-4 text-success" />}
                                    />
                                </AnimatedCard>
                                <AnimatedCard delay={0.1}>
                                    <MetricCard
                                        title="Revenue YTD"
                                        value={revenueYTD > 0 ? `$${revenueYTD.toLocaleString()}` : "$0"}
                                        icon={<TrendingUp className="w-4 h-4 text-primary" />}
                                    />
                                </AnimatedCard>
                                <AnimatedCard delay={0.15}>
                                    <MetricCard
                                        title="Avg Case Value"
                                        value={data.qb?.avgCaseValue ? `$${data.qb.avgCaseValue.toLocaleString()}` : "$0"}
                                        icon={<BarChart className="w-4 h-4 text-warning" />}
                                    />
                                </AnimatedCard>
                            </div>
                        </section>

                        {/* ── Section 2: Leads & Conversion ── */}
                        <section>
                            <h3 className="text-xs font-black uppercase tracking-widest text-sidebar-foreground mb-4">Leads & Conversion</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <AnimatedCard delay={0.2}>
                                    <MetricCard
                                        title={`New Leads (${filter.label})`}
                                        value={leadsInPeriod}
                                        icon={<Users className="w-4 h-4 text-primary" />}
                                    />
                                </AnimatedCard>
                                <AnimatedCard delay={0.25}>
                                    <MetricCard
                                        title={`Consults Scheduled (${filter.label})`}
                                        value={consultsInPeriod}
                                        icon={<Target className="w-4 h-4 text-warning" />}
                                    />
                                </AnimatedCard>
                                <AnimatedCard delay={0.3}>
                                    <MetricCard
                                        title="Consults / Leads"
                                        value={`${consultRate}%`}
                                        icon={<Percent className="w-4 h-4 text-success" />}
                                        subValue={`${consultsInPeriod} of ${leadsInPeriod} leads`}
                                    />
                                </AnimatedCard>
                                <AnimatedCard delay={0.35}>
                                    <MetricCard
                                        title="Retainers / Consults"
                                        value={`${retainerRate}%`}
                                        icon={<Percent className="w-4 h-4 text-purple-400" />}
                                        subValue={`${retainersInPeriod} of ${consultsInPeriod} consults`}
                                    />
                                </AnimatedCard>
                            </div>
                        </section>

                        {/* ── Section 3: Marketing ROI ── */}
                        <section>
                            <h3 className="text-xs font-black uppercase tracking-widest text-sidebar-foreground mb-4">Marketing ROI</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <AnimatedCard delay={0.4}>
                                    <MetricCard
                                        title="Ad Spend YTD"
                                        value={adSpendYTD > 0 ? `$${adSpendYTD.toLocaleString()}` : "—"}
                                        icon={<DollarSign className="w-4 h-4 text-error" />}
                                        subValue={adSpendYTD === 0 ? "From QB Advertising expenses" : undefined}
                                    />
                                </AnimatedCard>
                                <AnimatedCard delay={0.45}>
                                    <div className="glass-card p-6 h-full flex flex-col justify-between">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-black uppercase tracking-widest text-sidebar-foreground">ROI</span>
                                            <Target className="w-4 h-4 text-primary" />
                                        </div>
                                        {roiMultiple !== null ? (
                                            <>
                                                <div className="text-4xl font-black text-foreground font-display">{roiMultiple}x</div>
                                                <div className="text-sm text-success font-bold mt-1">+{roiPercent}% return</div>
                                                <div className="text-xs text-sidebar-foreground mt-2">Revenue vs. Ad Spend</div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-2xl font-bold text-sidebar-foreground">—</div>
                                                <div className="text-xs text-sidebar-foreground mt-2">Add advertising expenses in QuickBooks to track ROI</div>
                                            </>
                                        )}
                                    </div>
                                </AnimatedCard>
                                <AnimatedCard delay={0.5}>
                                    <div className="glass-card p-6 h-full flex flex-col justify-between">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-black uppercase tracking-widest text-sidebar-foreground">Cost Per Acquisition</span>
                                            <DollarSign className="w-4 h-4 text-warning" />
                                        </div>
                                        {cpa !== null ? (
                                            <>
                                                <div className="text-4xl font-black text-foreground font-display">${cpa.toLocaleString()}</div>
                                                <div className="text-xs text-sidebar-foreground mt-2">Ad Spend ÷ Retainers Signed</div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-2xl font-bold text-sidebar-foreground">—</div>
                                                <div className="text-xs text-sidebar-foreground mt-2">
                                                    {adSpendYTD === 0
                                                        ? "Requires ad spend data from QuickBooks"
                                                        : retainersInPeriod === 0
                                                            ? "No retainers signed in this period"
                                                            : "Calculating..."}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </AnimatedCard>
                            </div>
                        </section>

                        {/* ── Section 4: Cases & Leads by Source ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                            {/* Cases */}
                            <section>
                                <h3 className="text-xs font-black uppercase tracking-widest text-sidebar-foreground mb-4">Cases</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <AnimatedCard delay={0.55}>
                                        <MetricCard
                                            title="Active Cases"
                                            value={activeCases}
                                            icon={<Briefcase className="w-4 h-4 text-primary" />}
                                        />
                                    </AnimatedCard>
                                    <AnimatedCard delay={0.6}>
                                        <MetricCard
                                            title={`New Cases Signed (${filter.label})`}
                                            value={retainersInPeriod || newCasesSignedYTD}
                                            icon={<Star className="w-4 h-4 text-success" />}
                                        />
                                    </AnimatedCard>
                                </div>
                            </section>

                            {/* Lead Sources */}
                            <section>
                                <h3 className="text-xs font-black uppercase tracking-widest text-sidebar-foreground mb-4">Leads by Source</h3>
                                <AnimatedCard delay={0.65}>
                                    <div className="glass-card p-6">
                                        {Object.keys(leadSources).length > 0 ? (
                                            <div className="space-y-4">
                                                {Object.entries(leadSources)
                                                    .sort(([, a], [, b]) => b - a)
                                                    .map(([source, count], i) => {
                                                        const pct = Math.round((count / totalSourceLeads) * 100);
                                                        const color = LEAD_SOURCE_COLORS[i % LEAD_SOURCE_COLORS.length];
                                                        return (
                                                            <div key={source} className="space-y-1.5">
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-foreground font-semibold">{source}</span>
                                                                    <span className="text-sidebar-foreground font-medium">{count} ({pct}%)</span>
                                                                </div>
                                                                <div className="h-2 bg-sidebar-accent rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full ${color} opacity-70 transition-all duration-700`}
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-sidebar-foreground text-sm">
                                                No lead source data available
                                            </div>
                                        )}
                                    </div>
                                </AnimatedCard>
                            </section>
                        </div>

                    </div>
                </main>
            </div>
        </PageTransition>
    );
}
