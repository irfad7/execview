"use client";

import { useDashboard } from "@/lib/context";
import { Header } from "@/components/Header";
import { Card, MetricCard } from "@/components/Card";
import {
    CheckCircle2,
    CircleDollarSign,
    TrendingUp,
    Calendar,
    ArrowUpRight,
    FileText
} from "lucide-react";
import { PageTransition, AnimatedCard } from "@/lib/animations";

export default function BookkeepingPage() {
    const { data, loading } = useDashboard();

    if (loading || !data) {
        return (
            <div className="flex-1 flex flex-col">
                <Header title="Bookkeeping" />
                <div className="p-8">
                    <div className="h-64 bg-sidebar-accent animate-pulse rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <PageTransition>
            <div className="flex-1 flex flex-col">
                <Header title="Bookkeeping & Collections" />

                <main className="p-8 space-y-8">
                    {/* Top Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <AnimatedCard delay={0.1}>
                            <MetricCard
                                title="Closed Cases"
                                value={data.qb.closedCasesWeekly}
                                trend="up"
                                trendValue="12%"
                                icon={<CheckCircle2 className="w-4 h-4 text-primary" />}
                                subValue="This Week"
                            />
                        </AnimatedCard>
                        <AnimatedCard delay={0.2}>
                            <MetricCard
                                title="Total Payments Collected"
                                value={`$${data.qb.paymentsCollectedWeekly.toLocaleString()}`}
                                icon={<CircleDollarSign className="w-4 h-4 text-success" />}
                                subValue="Weekly Total"
                            />
                        </AnimatedCard>
                        <AnimatedCard delay={0.3}>
                            <MetricCard
                                title="Avg Case Value"
                                value={`$${data.qb.avgCaseValue.toLocaleString()}`}
                                trend="neutral"
                                trendValue="0%"
                                icon={<TrendingUp className="w-4 h-4 text-warning" />}
                            />
                        </AnimatedCard>
                        <AnimatedCard delay={0.4}>
                            <MetricCard
                                title="YTD Fees Collected"
                                value={`$${data.qb.revenueYTD.toLocaleString()}`}
                                icon={<Calendar className="w-4 h-4 text-primary" />}
                            />
                        </AnimatedCard>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Recent Collections */}
                        <div className="lg:col-span-2">
                            <AnimatedCard delay={0.5}>
                                <div className="glass-card overflow-hidden">
                                    <div className="p-6 border-b border-sidebar-border bg-white/5 flex items-center justify-between">
                                        <h3 className="font-bold text-foreground">Recent Payments Collected</h3>
                                        <button className="text-primary text-xs font-bold hover:underline">View All QuickBooks</button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-sidebar-border text-sidebar-foreground text-[10px] uppercase tracking-widest font-bold">
                                                    <th className="px-6 py-4">Client / Matter</th>
                                                    <th className="px-6 py-4">Amount</th>
                                                    <th className="px-6 py-4">Date</th>
                                                    <th className="px-6 py-4 text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-sidebar-border">
                                                {data.qb.recentCollections.map((payment) => (
                                                    <tr key={payment.id} className="hover:bg-sidebar-accent/50 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <span className="text-sm font-bold text-foreground">{payment.clientName}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-sm font-bold text-success">${payment.amount.toLocaleString()}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-sidebar-foreground font-medium">
                                                            {payment.date}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 text-success text-[10px] font-bold">
                                                                <div className="w-1 h-1 rounded-full bg-success" />
                                                                Received
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </AnimatedCard>
                        </div>

                        {/* Quick Actions / Summary */}
                        <div className="space-y-6">
                            <AnimatedCard delay={0.6}>
                                <div className="glass-card p-6 border-l-4 border-l-warning">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-foreground">Draft Invoices</h4>
                                            <p className="text-[10px] text-sidebar-foreground font-medium">Pending Review</p>
                                        </div>
                                    </div>
                                    <div className="text-2xl font-bold text-foreground mb-4">$12,450</div>
                                    <button className="w-full py-2.5 rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 text-foreground text-xs font-bold transition-all border border-sidebar-border flex items-center justify-center gap-2">
                                        View Drafts <ArrowUpRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </AnimatedCard>

                            <AnimatedCard delay={0.7}>
                                <div className="glass-card p-6 border-l-4 border-l-primary">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <CircleDollarSign className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-foreground">Outstanding Balance</h4>
                                            <p className="text-[10px] text-sidebar-foreground font-medium">Firm Wide</p>
                                        </div>
                                    </div>
                                    <div className="text-2xl font-bold text-foreground mb-4">$84,120</div>
                                    <button className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                                        Generate Statement
                                    </button>
                                </div>
                            </AnimatedCard>
                        </div>
                    </div>
                </main>
            </div>
        </PageTransition>
    );
}
