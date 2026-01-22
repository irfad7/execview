"use client";

import { useDashboard } from "@/lib/context";
import { useDateFilter } from "@/lib/dateFilterContext";
import { Header } from "@/components/Header";
import { MetricCard } from "@/components/Card";
import {
    Users,
    Phone,
    Calendar,
    ArrowRight,
    Filter,
    MoreVertical,
    Activity,
    Download
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { exportToPdf } from "@/lib/pdfUtils";
import { useMemo } from "react";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function LeadsPage() {
    const { data, loading } = useDashboard();
    const { filter, isInRange } = useDateFilter();

    if (loading || !data) {
        return (
            <div className="flex-1 flex flex-col">
                <Header title="Leads Tracking" />
                <div className="p-8">
                    <div className="h-64 bg-zinc-800 animate-pulse rounded-2xl" />
                </div>
            </div>
        );
    }

    // Filter opportunity feed by selected date range
    const leads = useMemo(() => {
        const allLeads = data.ghl?.opportunityFeed || [];
        return allLeads.filter(lead => {
            // Parse the date from the lead
            if (!lead.date) return true; // Include if no date
            // The date comes in "MM/DD/YYYY" format from the connector
            const parts = lead.date.split('/');
            if (parts.length === 3) {
                const leadDate = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
                return isInRange(leadDate);
            }
            return true;
        });
    }, [data.ghl?.opportunityFeed, isInRange]);

    // Calculate filtered metrics based on selected date range
    const filteredMetrics = useMemo(() => {
        const totalLeads = leads.length;
        const consultations = leads.filter(l =>
            l.stage?.toLowerCase().includes('consult') ||
            l.stage?.toLowerCase().includes('scheduled')
        ).length;
        return {
            leadsInPeriod: totalLeads,
            consultations
        };
    }, [leads]);

    return (
        <div className="flex-1 flex flex-col">
            <Header title="Leads & Opportunity Pipeline" />

            <main className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white font-display tracking-tight">Lead Performance</h2>
                        <p className="text-zinc-400 text-sm font-medium">
                            Showing {leads.length} opportunities for {filter.label}
                        </p>
                    </div>
                    <button
                        onClick={() => exportToPdf('leads-content', 'Leads_Pipeline_Report')}
                        className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl font-bold hover:bg-primary/20 transition-all text-sm"
                    >
                        <Download className="w-4 h-4" />
                        Export Leads PDF
                    </button>
                </div>

                <div id="leads-content" className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricCard
                            title={`Leads (${filter.label})`}
                            value={filteredMetrics.leadsInPeriod}
                            icon={<Users className="w-4 h-4 text-primary" />}
                        />
                        <MetricCard
                            title="Avg Time on Phone"
                            value={data.ghl?.avgTimeOnPhone || "0m"}
                            icon={<Phone className="w-4 h-4 text-success" />}
                            subValue="Per qualified lead"
                        />
                        <MetricCard
                            title="Consultations"
                            value={filteredMetrics.consultations}
                            icon={<Calendar className="w-4 h-4 text-warning" />}
                            subValue={`In ${filter.label.toLowerCase()}`}
                        />
                        <MetricCard
                            title="Conversion Rate"
                            value={`${data.ghl?.conversionRate || 0}%`}
                            icon={<Activity className="w-4 h-4 text-purple-500" />}
                        />
                    </div>

                    <div className="glass-card">
                        <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">Daily Opportunity Feed</h3>
                            <div className="flex gap-2">
                                <button className="bg-sidebar-accent text-zinc-300 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 hover:text-white transition-colors">
                                    <Filter className="w-3.5 h-3.5" /> Filter
                                </button>
                                <button className="bg-primary px-3 py-1.5 rounded-lg text-white text-xs font-bold shadow-lg shadow-primary/20">
                                    Add New Lead
                                </button>
                            </div>
                        </div>

                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-sidebar-border text-zinc-500 text-xs uppercase tracking-wider">
                                        <th className="px-6 py-4 font-semibold">Lead Name</th>
                                        <th className="px-6 py-4 font-semibold">Owner</th>
                                        <th className="px-6 py-4 font-semibold">Date Created</th>
                                        <th className="px-6 py-4 font-semibold">On Phone</th>
                                        <th className="px-6 py-4 font-semibold">Pipeline Stage</th>
                                        <th className="px-6 py-4 font-semibold">Source</th>
                                        <th className="px-6 py-4 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-sidebar-border text-sm">
                                    {leads.map((lead: any) => (
                                        <tr key={lead.id} className="hover:bg-sidebar-accent/20 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-white group-hover:text-primary transition-colors">{lead.contactName || lead.lead}</div>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-400">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 border border-white/5">
                                                        {lead.owner.charAt(0)}
                                                    </div>
                                                    {lead.owner}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-500">{lead.date}</td>
                                            <td className="px-6 py-4 font-medium text-zinc-300">{lead.timeOnPhone}</td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                    lead.stage === "Consult Scheduled" ? "bg-primary/10 text-primary border border-primary/20" :
                                                        lead.stage === "Retainer Sent" ? "bg-success/10 text-success border border-success/20" :
                                                            lead.stage === "Lost" ? "bg-error/10 text-error border border-error/20" :
                                                                "bg-zinc-800 text-zinc-400 border border-white/5"
                                                )}>
                                                    {lead.stage}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-500 font-medium">{lead.source}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-zinc-600 hover:text-white transition-colors">
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/10 flex items-center justify-center">
                            <button className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5">
                                Load More Opportunities <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
