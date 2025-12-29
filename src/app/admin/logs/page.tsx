"use client";

import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { List, Filter, RefreshCw, AlertCircle, CheckCircle, Info, Clock } from "lucide-react";
import { PageTransition, AnimatedCard } from "@/lib/animations";
import { useState, useEffect } from "react";
import { getLogs } from "@/lib/dbActions";

export default function LogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLogs = async () => {
        setIsLoading(true);
        const data = await getLogs(100);
        setLogs(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const getIcon = (level: string) => {
        switch (level.toLowerCase()) {
            case 'error': return <AlertCircle className="w-4 h-4 text-error" />;
            case 'success': return <CheckCircle className="w-4 h-4 text-success" />;
            case 'warning': return <AlertCircle className="w-4 h-4 text-warning" />;
            default: return <Info className="w-4 h-4 text-primary" />;
        }
    };

    return (
        <PageTransition>
            <div className="flex-1 flex flex-col">
                <Header title="System Activity Logs" />

                <main className="p-8 max-w-6xl mx-auto w-full space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground font-display tracking-tight">Operation Logs</h2>
                            <p className="text-sidebar-foreground text-sm font-medium">Audit trail of API syncs and system events</p>
                        </div>
                        <button
                            onClick={fetchLogs}
                            className="p-2.5 bg-sidebar-accent hover:bg-sidebar-foreground/10 rounded-xl transition-all border border-sidebar-border"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <AnimatedCard>
                        <div className="glass-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-sidebar-border bg-sidebar-accent/30">
                                            <th className="px-6 py-4 text-[10px] font-bold text-sidebar-foreground uppercase tracking-widest">Timestamp</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-sidebar-foreground uppercase tracking-widest">Service</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-sidebar-foreground uppercase tracking-widest">Event</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-sidebar-foreground uppercase tracking-widest">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-sidebar-border">
                                        {logs.length === 0 && !isLoading ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-sm text-sidebar-foreground">
                                                    No logs found.
                                                </td>
                                            </tr>
                                        ) : (
                                            logs.map((log) => (
                                                <tr key={log.id} className="hover:bg-sidebar-accent/20 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 text-xs text-sidebar-foreground">
                                                            <Clock className="w-3 h-3 opacity-50" />
                                                            {new Date(log.created_at).toLocaleString()}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-1 bg-sidebar-accent rounded-md text-[10px] font-bold text-foreground uppercase tracking-wider">
                                                            {log.service}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                                                            {getIcon(log.level)}
                                                            {log.message}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-xs text-sidebar-foreground truncate max-w-md">
                                                            {log.details || "-"}
                                                        </p>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </AnimatedCard>
                </main>
            </div>
        </PageTransition>
    );
}
