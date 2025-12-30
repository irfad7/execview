"use client";

import { useDashboard } from "@/lib/context";
import { Header } from "@/components/Header";
import { MetricCard } from "@/components/Card";
import {
    Briefcase,
    Calendar,
    AlertCircle,
    FileCheck,
    CircleDollarSign,
    Gavel,
    Download
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { exportToPdf } from "@/lib/pdfUtils";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function CasesPage() {
    const { data, loading } = useDashboard();

    if (loading || !data) {
        return (
            <div className="flex-1 flex flex-col">
                <Header title="Case Management" />
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => <MetricCard key={i} title="Loading..." value="..." loading />)}
                </div>
            </div>
        );
    }

    const clioData = data.clio || [];
    const casesWithNoDiscovery = clioData.filter(c => !c.discoveryReceived);
    const casesWithNoPlea = clioData.filter(c => !c.pleaOfferReceived);
    const totalOutstanding = clioData.reduce((acc, c) => acc + c.outstandingBalance, 0);

    const discoveryPercentage = clioData.length > 0 ? Math.round((casesWithNoDiscovery.length / clioData.length) * 100) : 0;
    const pleaPercentage = clioData.length > 0 ? Math.round((casesWithNoPlea.length / clioData.length) * 100) : 0;

    const isSoon = (dateStr?: string) => {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const now = new Date("2025-12-23T04:52:04+05:00");
        const diffTime = date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays < 7;
    };

    return (
        <div className="flex-1 flex flex-col">
            <Header title="Case Management" />

            <main className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white font-display tracking-tight">Case Portfolio</h2>
                        <p className="text-zinc-400 text-sm font-medium">Tracking deadlines, discovery, and balances</p>
                    </div>
                    <button
                        onClick={() => exportToPdf('cases-content', 'Case_Portfolio_Report')}
                        className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl font-bold hover:bg-primary/20 transition-all text-sm"
                    >
                        <Download className="w-4 h-4" />
                        Export Cases PDF
                    </button>
                </div>

                <div id="cases-content" className="space-y-8">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricCard
                            title="Weekly Open Cases"
                            value={clioData.length}
                            icon={<Briefcase className="w-4 h-4" />}
                            trend="up"
                            trendValue="12%"
                        />
                        <MetricCard
                            title="Outstanding Balance"
                            value={`$${totalOutstanding.toLocaleString()}`}
                            icon={<CircleDollarSign className="w-4 h-4" />}
                            trend="down"
                            trendValue="5%"
                        />
                        <MetricCard
                            title="No Discovery Received"
                            value={`${discoveryPercentage}%`}
                            subValue={`${casesWithNoDiscovery.length} cases outstanding`}
                            icon={<AlertCircle className="w-4 h-4 text-warning" />}
                        />
                        <MetricCard
                            title="No Plea Offer Received"
                            value={`${pleaPercentage}%`}
                            subValue={`${casesWithNoPlea.length} cases outstanding`}
                            icon={<AlertCircle className="w-4 h-4 text-error" />}
                        />
                    </div>

                    {/* Actionable List */}
                    <div className="glass-card overflow-hidden">
                        <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">Open Cases & Deadlines</h3>
                            <div className="flex gap-2">
                                <span className="flex items-center gap-1.5 text-xs text-zinc-400 bg-sidebar-accent px-2 py-1 rounded">
                                    <div className="w-2 h-2 rounded-full bg-error" /> Urgent Deadline
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-sidebar-border text-sidebar-foreground text-[10px] uppercase tracking-widest font-bold">
                                        <th className="px-6 py-4">Matter</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4 text-center">Discovery</th>
                                        <th className="px-6 py-4 text-center">Plea Offer</th>
                                        <th className="px-6 py-4">Court Date</th>
                                        <th className="px-6 py-4 text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-sidebar-border">
                                    {clioData.map((c) => (
                                        <tr key={c.id} className="hover:bg-sidebar-accent/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-foreground group-hover:text-primary transition-colors">{c.name}</div>
                                                <div className="text-[10px] text-sidebar-foreground font-medium uppercase tracking-tighter">{c.caseNumber}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-foreground opacity-80">
                                                    {c.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {c.discoveryReceived ? (
                                                    <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center mx-auto">
                                                        <FileCheck className="w-4 h-4 text-success" />
                                                    </div>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center mx-auto">
                                                        <AlertCircle className="w-4 h-4 text-error" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {c.pleaOfferReceived ? (
                                                    <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center mx-auto">
                                                        <Gavel className="w-4 h-4 text-success" />
                                                    </div>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center mx-auto">
                                                        <AlertCircle className="w-4 h-4 text-error" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={cn(
                                                    "flex items-center gap-2 text-sm font-semibold",
                                                    isSoon(c.upcomingCourtDate) ? "text-error" : "text-sidebar-foreground"
                                                )}>
                                                    <Calendar className="w-4 h-4" />
                                                    {c.upcomingCourtDate || "No date set"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={cn(
                                                    "text-sm font-bold",
                                                    c.outstandingBalance > 0 ? "text-foreground" : "text-sidebar-foreground opacity-50"
                                                )}>
                                                    ${c.outstandingBalance.toLocaleString()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
