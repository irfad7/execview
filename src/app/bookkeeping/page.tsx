"use client";

import { useMemo } from "react";
import { useDashboard } from "@/lib/context";
import { useDateFilter } from "@/lib/dateFilterContext";
import { Header } from "@/components/Header";
import { Card, MetricCard } from "@/components/Card";
import {
    CheckCircle2,
    CircleDollarSign,
    TrendingUp,
    Calendar,
    ArrowUpRight,
    FileText,
    Download
} from "lucide-react";
import { PageTransition, AnimatedCard } from "@/lib/animations";
import { exportToPdf } from "@/lib/pdfUtils";

export default function BookkeepingPage() {
    const { data, loading } = useDashboard();
    const { filter, isInRange } = useDateFilter();

    // Filter QB transactions by selected date range
    const filteredTransactions = useMemo(() => {
        const allTransactions = data?.qb?.transactions || [];
        return allTransactions.filter(txn => {
            if (!txn.date) return true;
            return isInRange(txn.date);
        });
    }, [data?.qb?.transactions, isInRange]);

    // Calculate metrics from filtered transactions
    const filteredMetrics = useMemo(() => {
        const totalCollected = filteredTransactions.reduce((sum, txn) => sum + txn.amount, 0);
        const avgValue = filteredTransactions.length > 0 ? totalCollected / filteredTransactions.length : 0;
        return {
            totalCollected: Math.round(totalCollected),
            transactionCount: filteredTransactions.length,
            avgValue: Math.round(avgValue)
        };
    }, [filteredTransactions]);

    // Get recent transactions (sorted by date, most recent first)
    const recentTransactions = useMemo(() => {
        return [...filteredTransactions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10);
    }, [filteredTransactions]);

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

    // Calculate outstanding balance from Clio
    const clioOutstanding = data.clioData?.caseManagement?.totalOutstandingBalance
        || data.clio?.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0)
        || 0;

    return (
        <PageTransition>
            <div className="flex-1 flex flex-col">
                <Header title="Bookkeeping & Collections" />

                <main className="p-8 space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white font-display tracking-tight">Financial Overview</h2>
                            <p className="text-zinc-400 text-sm font-medium">
                                Showing {filteredTransactions.length} transactions for {filter.label}
                            </p>
                        </div>
                        <button
                            onClick={() => exportToPdf('bookkeeping-content', 'Bookkeeping_Report')}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl font-bold hover:bg-primary/20 transition-all text-sm"
                        >
                            <Download className="w-4 h-4" />
                            Export PDF
                        </button>
                    </div>

                    <div id="bookkeeping-content" className="space-y-8">
                    {/* Top Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <AnimatedCard delay={0.1}>
                            <MetricCard
                                title={`Transactions (${filter.label})`}
                                value={filteredMetrics.transactionCount}
                                icon={<CheckCircle2 className="w-4 h-4 text-primary" />}
                                subValue="Deposits & payments"
                            />
                        </AnimatedCard>
                        <AnimatedCard delay={0.2}>
                            <MetricCard
                                title={`Collected (${filter.label})`}
                                value={filteredMetrics.totalCollected > 0 ? `$${filteredMetrics.totalCollected.toLocaleString()}` : "—"}
                                icon={<CircleDollarSign className="w-4 h-4 text-success" />}
                                subValue="Total collected"
                            />
                        </AnimatedCard>
                        <AnimatedCard delay={0.3}>
                            <MetricCard
                                title="Avg Transaction"
                                value={filteredMetrics.avgValue > 0 ? `$${filteredMetrics.avgValue.toLocaleString()}` : "—"}
                                icon={<TrendingUp className="w-4 h-4 text-warning" />}
                            />
                        </AnimatedCard>
                        <AnimatedCard delay={0.4}>
                            <MetricCard
                                title="YTD Revenue"
                                value={data.qb?.revenueYTD ? `$${data.qb.revenueYTD.toLocaleString()}` : "—"}
                                icon={<Calendar className="w-4 h-4 text-primary" />}
                                subValue="From P&L report"
                            />
                        </AnimatedCard>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Recent Collections */}
                        <div className="lg:col-span-2">
                            <AnimatedCard delay={0.5}>
                                <div className="glass-card overflow-hidden">
                                    <div className="p-6 border-b border-sidebar-border bg-white/5 flex items-center justify-between">
                                        <h3 className="font-bold text-foreground">Transactions ({filter.label})</h3>
                                        <span className="text-xs text-sidebar-foreground">{recentTransactions.length} of {filteredTransactions.length} shown</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-sidebar-border text-sidebar-foreground text-[10px] uppercase tracking-widest font-bold">
                                                    <th className="px-6 py-4">Client</th>
                                                    <th className="px-6 py-4">Type</th>
                                                    <th className="px-6 py-4">Amount</th>
                                                    <th className="px-6 py-4">Date</th>
                                                    <th className="px-6 py-4 text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-sidebar-border">
                                                {recentTransactions.length > 0 ? (
                                                    recentTransactions.map((txn) => (
                                                        <tr key={txn.id} className="hover:bg-sidebar-accent/50 transition-colors group">
                                                            <td className="px-6 py-4">
                                                                <span className="text-sm font-bold text-foreground">{txn.clientName}</span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-xs font-medium text-sidebar-foreground capitalize">{txn.type}</span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-sm font-bold text-success">${txn.amount.toLocaleString()}</span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-sidebar-foreground font-medium">
                                                                {txn.date}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 text-success text-[10px] font-bold">
                                                                    <div className="w-1 h-1 rounded-full bg-success" />
                                                                    Received
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-8 text-center text-sidebar-foreground">
                                                            No transactions found for {filter.label.toLowerCase()}
                                                        </td>
                                                    </tr>
                                                )}
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
                                    <div className="text-2xl font-bold text-foreground mb-4">
                                        {data.qb?.revenueYTD ? `$${Math.round(data.qb.revenueYTD * 0.05).toLocaleString()}` : "—"}
                                    </div>
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
                                            <p className="text-[10px] text-sidebar-foreground font-medium">Firm Wide (from Clio)</p>
                                        </div>
                                    </div>
                                    <div className="text-2xl font-bold text-foreground mb-4">
                                        {(() => {
                                            const clioOutstanding = data.clioData?.caseManagement?.totalOutstandingBalance
                                                || data.clio?.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0)
                                                || 0;
                                            return clioOutstanding > 0 ? `$${clioOutstanding.toLocaleString()}` : "—";
                                        })()}
                                    </div>
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
