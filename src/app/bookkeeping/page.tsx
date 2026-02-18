"use client";

import { useMemo } from "react";
import { useDashboard } from "@/lib/context";
import { useDateFilter } from "@/lib/dateFilterContext";
import { Header } from "@/components/Header";
import { MetricCard } from "@/components/Card";
import {
    CircleDollarSign,
    TrendingUp,
    Calendar,
    Download,
    Briefcase
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
            .slice(0, 15);
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
                    {/* Top Stats - All connected to date filter */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <AnimatedCard delay={0.1}>
                            <MetricCard
                                title={`Payments (${filter.label})`}
                                value={filteredMetrics.transactionCount}
                                icon={<Briefcase className="w-4 h-4 text-primary" />}
                            />
                        </AnimatedCard>
                        <AnimatedCard delay={0.2}>
                            <MetricCard
                                title={`Total Collected (${filter.label})`}
                                value={filteredMetrics.totalCollected > 0 ? `$${filteredMetrics.totalCollected.toLocaleString()}` : "$0"}
                                icon={<CircleDollarSign className="w-4 h-4 text-success" />}
                            />
                        </AnimatedCard>
                        <AnimatedCard delay={0.3}>
                            <MetricCard
                                title={`Avg Payment (${filter.label})`}
                                value={filteredMetrics.avgValue > 0 ? `$${filteredMetrics.avgValue.toLocaleString()}` : "$0"}
                                icon={<TrendingUp className="w-4 h-4 text-warning" />}
                            />
                        </AnimatedCard>
                        <AnimatedCard delay={0.4}>
                            <MetricCard
                                title="YTD Fees Collected"
                                value={data.qb?.revenueYTD ? `$${data.qb.revenueYTD.toLocaleString()}` : "$0"}
                                icon={<Calendar className="w-4 h-4 text-primary" />}
                            />
                        </AnimatedCard>
                    </div>

                    {/* Recent Collections - Full Width */}
                    <AnimatedCard delay={0.5}>
                        <div className="glass-card overflow-hidden">
                            <div className="p-6 border-b border-sidebar-border bg-white/5">
                                <h3 className="font-bold text-foreground">Recent Payments Collected</h3>
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
                                        {recentTransactions.length > 0 ? (
                                            recentTransactions.map((txn) => {
                                                // Determine display name - use client name or show transaction type
                                                const isGenericName = !txn.clientName ||
                                                    txn.clientName === "Unknown Client" ||
                                                    txn.clientName === "Client Payment" ||
                                                    txn.clientName.startsWith("Ref:");
                                                const displayName = isGenericName
                                                    ? `${txn.type === 'deposit' ? 'Bank Deposit' : txn.type === 'salesReceipt' ? 'Sales Receipt' : 'Payment'}`
                                                    : txn.clientName;

                                                return (
                                                <tr key={txn.id} className="hover:bg-sidebar-accent/50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-bold text-foreground">{displayName}</span>
                                                        {txn.account && <span className="text-xs text-zinc-500 block">{txn.account}</span>}
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
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-sidebar-foreground">
                                                    No payments found for {filter.label.toLowerCase()}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </AnimatedCard>
                    </div>
                </main>
            </div>
        </PageTransition>
    );
}
