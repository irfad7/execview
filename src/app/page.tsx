"use client";

import { useDashboard } from "@/lib/context";
import { Header } from "@/components/Header";
import { MetricCard } from "@/components/Card";
import {
    BarChart2,
    ArrowUpRight,
    TrendingUp,
    Clock,
    ExternalLink,
    Briefcase,
    Users,
    Calendar,
    AlertCircle
} from "lucide-react";
import { PageTransition, AnimatedCard } from "@/lib/animations";

export default function OverviewPage() {
    const { data, loading } = useDashboard();

    if (loading) {
        return (
            <div className="flex-1 flex flex-col">
                <Header title="ExecView Dashboard" />
                <div className="p-8">
                    <div className="h-64 bg-zinc-800 animate-pulse rounded-2xl" />
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex-1 flex flex-col">
                <Header title="ExecView Dashboard" />
                <div className="p-8 flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="p-4 bg-zinc-800 rounded-full">
                        <ArrowUpRight className="w-8 h-8 text-zinc-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">No Data Available</h2>
                    <p className="text-zinc-400 max-w-md">
                        Connect your integrations to start seeing real-time insights from your firm's data.
                    </p>
                    <a href="/integrations" className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20">
                        Connect Integrations
                    </a>
                </div>
            </div>
        );
    }

    // Calculate real metrics from data
    const clioData = data.clio || [];
    const urgentCases = clioData.filter(c => !c.discoveryReceived || !c.pleaOfferReceived);
    const casesWithCourtDates = clioData.filter(c => c.upcomingCourtDate);
    const activeCases = data.activeCases || clioData.length || 0;
    const weeklyLeads = data.ghl?.leadsWeekly || 0;
    const ytdRevenue = data.qb?.revenueYTD || 0;
    const weeklyOpportunities = data.ghl?.opportunitiesWeekly || 0;

    return (
        <PageTransition>
            <div className="flex-1 flex flex-col">
                <Header title="Executive Overview" />

                <main className="p-8 space-y-8">
                    {/* Welcome Section */}
                    <AnimatedCard delay={0.1}>
                        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 p-8">
                            <div className="relative z-10">
                                <h1 className="text-3xl font-extrabold text-white mb-2 font-display">Welcome back, Counselor.</h1>
                                <p className="text-zinc-400 max-w-lg">
                                    You have <span className="text-white font-bold">{activeCases} active cases</span> and{' '}
                                    <span className="text-white font-bold">{weeklyLeads} leads</span> this week.
                                    {urgentCases.length > 0 && (
                                        <span className="text-warning"> {urgentCases.length} cases need attention.</span>
                                    )}
                                </p>

                                <div className="flex gap-4 mt-8">
                                    <button
                                        onClick={async () => {
                                            const { refreshDashboardData } = await import('@/lib/dbActions');
                                            await refreshDashboardData();
                                            window.location.reload();
                                        }}
                                        className="bg-primary hover:bg-primary/80 text-white px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                                    >
                                        Refresh Data <ArrowUpRight className="w-4 h-4" />
                                    </button>
                                    <button className="bg-white/5 hover:bg-white/10 text-white px-6 py-2.5 rounded-xl font-semibold transition-all border border-white/10">
                                        Download Report
                                    </button>
                                </div>
                            </div>

                            <div className="absolute right-0 top-0 w-1/3 h-full overflow-hidden pointer-events-none opacity-20">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary blur-[120px] rounded-full" />
                            </div>
                        </div>
                    </AnimatedCard>

                    {/* Global Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <AnimatedCard delay={0.2}>
                            <MetricCard
                                title="YTD Revenue"
                                value={ytdRevenue > 0 ? `$${ytdRevenue.toLocaleString()}` : "—"}
                                icon={<TrendingUp className="w-4 h-4" />}
                            />
                        </AnimatedCard>
                        <AnimatedCard delay={0.3}>
                            <MetricCard
                                title="Active Cases"
                                value={activeCases}
                                icon={<Briefcase className="w-4 h-4 text-primary" />}
                            />
                        </AnimatedCard>
                        <AnimatedCard delay={0.4}>
                            <MetricCard
                                title="Weekly Leads"
                                value={weeklyLeads}
                                icon={<Users className="w-4 h-4" />}
                            />
                        </AnimatedCard>
                        <AnimatedCard delay={0.5}>
                            <MetricCard
                                title="Weekly Opportunities"
                                value={weeklyOpportunities}
                                icon={<BarChart2 className="w-4 h-4" />}
                            />
                        </AnimatedCard>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Cases Needing Attention */}
                        <AnimatedCard delay={0.6}>
                            <div className="glass-card p-6 h-full">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-semibold text-white">Cases Needing Attention</h3>
                                    {urgentCases.length > 0 && (
                                        <span className="text-xs text-warning font-bold uppercase tracking-widest">{urgentCases.length} Items</span>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {urgentCases.length > 0 ? (
                                        urgentCases.slice(0, 4).map((item) => (
                                            <div key={item.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all group">
                                                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
                                                    <AlertCircle className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-bold text-zinc-200">{item.name}</div>
                                                    <div className="text-xs text-zinc-500">
                                                        {!item.discoveryReceived && !item.pleaOfferReceived
                                                            ? "Missing Discovery & Plea Offer"
                                                            : !item.discoveryReceived
                                                                ? "Missing Discovery"
                                                                : "Missing Plea Offer"}
                                                    </div>
                                                </div>
                                                <button className="text-zinc-500 group-hover:text-white transition-colors">
                                                    <ExternalLink className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-zinc-500">
                                            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p>No urgent items</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </AnimatedCard>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 gap-6">
                            <AnimatedCard delay={0.7}>
                                <div className="glass-card p-6 flex flex-col justify-between h-full">
                                    <div className="text-zinc-500 text-sm mb-4 font-medium">Retainers Signed</div>
                                    <div className="text-3xl font-bold text-white mb-2">{data.ghl?.retainersSigned || 0}</div>
                                    <div className="text-xs text-zinc-500">This week</div>
                                </div>
                            </AnimatedCard>

                            <AnimatedCard delay={0.8}>
                                <div className="glass-card p-6 flex flex-col justify-between h-full">
                                    <div className="text-zinc-500 text-sm mb-4 font-medium">Consultations</div>
                                    <div className="text-3xl font-bold text-white mb-2">{data.ghl?.consultsScheduled || 0}</div>
                                    <div className="text-xs text-zinc-500">Scheduled this week</div>
                                </div>
                            </AnimatedCard>

                            <div className="lg:col-span-2">
                                <AnimatedCard delay={0.9}>
                                    <div className="glass-card p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-zinc-500 text-sm mb-1 font-medium">New Signed Cases</div>
                                                <div className="text-2xl font-bold text-white">{data.newCasesSignedWeekly || 0}</div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <div className="text-[10px] text-zinc-500 uppercase tracking-tighter">YTD Total</div>
                                                    <div className="text-primary font-bold">{data.newCasesSignedYTD || 0}</div>
                                                </div>
                                                <div className="w-px h-8 bg-white/10" />
                                                <div className="text-right">
                                                    <div className="text-[10px] text-zinc-500 uppercase tracking-tighter">Cases Closed</div>
                                                    <div className="text-success font-bold">{data.qb?.closedCasesWeekly || 0}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </AnimatedCard>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </PageTransition>
    );
}
