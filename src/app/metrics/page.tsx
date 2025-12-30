"use client";

import { useDashboard } from "@/lib/context";
import { Header } from "@/components/Header";
import { Card, MetricCard } from "@/components/Card";
import {
    Users,
    Target,
    TrendingUp,
    BarChart,
    ArrowUpRight,
    PieChart,
    FileText as FileIcon,
    Download
} from "lucide-react";
import { PageTransition, AnimatedCard } from "@/lib/animations";
import { exportToPdf } from "@/lib/pdfUtils";

const PROGRESS_GOAL = 500000;

export default function MetricsPage() {
    const { data, loading } = useDashboard();

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

    const revenueYTD = data.qb?.revenueYTD || 0;
    const progressPercentage = (revenueYTD / PROGRESS_GOAL) * 100;

    return (
        <PageTransition>
            <div className="flex-1 flex flex-col">
                <Header title="Firm Performance Analytics" />

                <main className="p-8 space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground font-display tracking-tight">Performance Overview</h2>
                            <p className="text-sidebar-foreground text-sm font-medium">Detailed breakdown of firm health and ROI</p>
                        </div>
                        <button
                            onClick={() => exportToPdf('metrics-content', 'Firm_Metrics_Report')}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl font-bold hover:bg-primary/20 transition-all text-sm"
                        >
                            <Download className="w-4 h-4" />
                            Export PDF Report
                        </button>
                    </div>

                    <div id="metrics-content" className="space-y-8">
                        {/* Top Performance Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Main Goal Tracking */}
                            <div className="lg:col-span-2">
                                <AnimatedCard delay={0.1}>
                                    <div className="glass-card p-8 h-full relative overflow-hidden">
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-8">
                                                <div>
                                                    <h3 className="text-xl font-bold text-foreground mb-1">Annual Revenue Goal</h3>
                                                    <p className="text-sm text-sidebar-foreground">Target: ${PROGRESS_GOAL.toLocaleString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-3xl font-black text-primary font-display">{progressPercentage.toFixed(1)}%</div>
                                                    <div className="text-[10px] font-bold text-sidebar-foreground uppercase tracking-widest">To Target</div>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="h-4 bg-sidebar-accent rounded-full overflow-hidden border border-sidebar-border shadow-inner">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary/60 shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all duration-1000"
                                                        style={{ width: `${progressPercentage}%` }}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-4 bg-sidebar-accent/50 rounded-xl border border-sidebar-border">
                                                        <div className="text-sidebar-foreground text-xs mb-1 font-medium">Weekly Total Collected</div>
                                                        <div className="text-foreground font-bold text-lg">${(data.qb?.paymentsCollectedWeekly || 0).toLocaleString()}</div>
                                                    </div>
                                                    <div className="p-4 bg-sidebar-accent/50 rounded-xl border border-sidebar-border">
                                                        <div className="text-sidebar-foreground text-xs mb-1 font-medium">Avg Case Value</div>
                                                        <div className="text-foreground font-bold text-lg">${(data.qb?.avgCaseValue || 0).toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </AnimatedCard>
                            </div>

                            {/* ROI Card */}
                            <AnimatedCard delay={0.2}>
                                <div className="glass-card p-8 h-full flex flex-col justify-between">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-foreground">Marketing ROI</h3>
                                        <Target className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="py-6">
                                        <div className="text-5xl font-black text-foreground mb-2 font-display">{data.ghl?.roi || 0}x</div>
                                        <div className="text-sm text-sidebar-foreground font-medium">Return on Current Ad Spend</div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-sidebar-foreground">Conversion Rate</span>
                                            <span className="text-success">{((data.ghl?.conversionRate || 0) * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="h-1.5 bg-sidebar-accent rounded-full overflow-hidden">
                                            <div className="h-full bg-success w-[15%]" />
                                        </div>
                                    </div>
                                </div>
                            </AnimatedCard>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Lead Sources Chart-like View */}
                            <AnimatedCard delay={0.3}>
                                <div className="glass-card p-6">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="font-bold text-foreground flex items-center gap-2">
                                            <PieChart className="w-4 h-4 text-primary" />
                                            Lead Source Distribution
                                        </h3>
                                        <button className="text-xs font-bold text-sidebar-foreground hover:text-primary transition-colors">Details</button>
                                    </div>

                                    <div className="space-y-6">
                                        {(data.ghl?.leadSources || []).map((source, i) => (
                                            <div key={source.source} className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-foreground font-bold">{source.source}</span>
                                                    <span className="text-sidebar-foreground font-medium">{source.count} Leads ({source.percentage}%)</span>
                                                </div>
                                                <div className="h-2 bg-sidebar-accent rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary/40 group-hover:bg-primary transition-all duration-500"
                                                        style={{
                                                            width: `${source.percentage}%`,
                                                            backgroundColor: `rgba(99, 102, 241, ${0.3 + (i * 0.2)})`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </AnimatedCard>

                            {/* Lead Funnel Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <AnimatedCard delay={0.4}>
                                    <MetricCard
                                        title="Weekly Leads"
                                        value={data.ghl?.leadsWeekly || 0}
                                        trend="up"
                                        trendValue="12%"
                                        icon={<Users className="w-4 h-4" />}
                                    />
                                </AnimatedCard>
                                <AnimatedCard delay={0.5}>
                                    <MetricCard
                                        title="Consultations"
                                        value={data.ghl?.consultationsWeekly || 0}
                                        trend="up"
                                        trendValue="5%"
                                        icon={<BarChart className="w-4 h-4 text-warning" />}
                                    />
                                </AnimatedCard>
                                <div className="md:col-span-2">
                                    <AnimatedCard delay={0.6}>
                                        <div className="glass-card p-6 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
                                            <div>
                                                <div className="text-sidebar-foreground text-xs mb-1 font-bold uppercase tracking-wider">Avg Time on Phone</div>
                                                <div className="text-2xl font-black text-foreground font-display">{data.ghl?.avgTimeOnPhone || "0m"}</div>
                                            </div>
                                            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                                                <TrendingUp className="w-6 h-6" />
                                            </div>
                                        </div>
                                    </AnimatedCard>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </PageTransition>
    );
}
