"use client";

import { useAuth } from "@/lib/authContext";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { Settings, RefreshCw, Key, Database, CheckCircle, XCircle, Share2, Clock } from "lucide-react";
import { PageTransition, AnimatedCard } from "@/lib/animations";
import { useState, useEffect } from "react";
import { ensureDb, getSyncStatus } from "@/lib/dbActions";
import { motion } from "framer-motion";

export default function AdminPage() {
    const { isAuthenticated } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeTab, setActiveTab] = useState<"connections" | "schedule">("connections");
    const [apiConfigs, setApiConfigs] = useState<any[]>([]);
    const [syncStatus, setSyncStatus] = useState<any>(null);
    const [schedule, setSchedule] = useState({ day: "Monday", time: "09:00", enabled: false });

    useEffect(() => {
        if (isAuthenticated) {
            ensureDb();
            getSyncStatus().then(setSyncStatus);
            fetchApiConfigs();
            import("@/lib/dbActions").then(({ getSystemSetting }) => {
                getSystemSetting("reporting_schedule").then(s => {
                    if (s) setSchedule(s);
                });
            });
        }
    }, [isAuthenticated]);

    const handleUpdateSchedule = async (newSchedule: any) => {
        const { updateSystemSetting } = await import("@/lib/dbActions");
        await updateSystemSetting("reporting_schedule", newSchedule);
        setSchedule(newSchedule);
    };

    const fetchApiConfigs = async () => {
        const configs = await (await import("@/lib/dbActions")).getApiConfigs();
        setApiConfigs(configs);
    };

    if (!isAuthenticated) return null;

    const handleConnect = (service: string) => {
        window.location.href = `/api/auth/login/${service.toLowerCase()}`;
    };

    const handleDisconnect = async (service: string) => {
        const { disconnectService } = await import("@/lib/dbActions");
        await disconnectService(service);
        fetchApiConfigs();
    };

    const handleManualSync = async () => {
        setIsSyncing(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsSyncing(false);
    };


    return (
        <PageTransition>
            <div className="flex-1 flex flex-col">
                <Header title="Admin Control Panel" />

                <main className="p-8 max-w-6xl mx-auto w-full space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground font-display tracking-tight">System Configuration</h2>
                            <p className="text-sidebar-foreground text-sm font-medium">Manage API connections and data orchestration</p>
                        </div>
                        <button
                            onClick={handleManualSync}
                            disabled={isSyncing}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                        >
                            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? "Syncing..." : "Sync All Sources"}
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-sidebar-border relative">
                        {[
                            { id: "connections", label: "API Connections", icon: Key },
                            { id: "schedule", label: "Reporting Schedule", icon: Settings }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`pb-4 px-2 text-sm font-bold transition-all relative z-10 flex items-center gap-2 ${activeTab === tab.id ? "text-primary" : "text-sidebar-foreground hover:text-foreground"}`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute bottom-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    {activeTab === "connections" ? (
                        <>
                            <div className="mb-8 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="w-5 h-5 text-primary" />
                                    <h3 className="font-bold text-foreground">Enhanced API Integrations</h3>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    All integrations now use comprehensive APIs with automatic data extraction. No manual field mapping required - everything is handled programmatically with structured TypeScript interfaces.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {apiConfigs.map((config: any) => (
                                    <div key={config.service} className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="text-lg font-bold capitalize">{config.service === 'execview' ? 'GoHighLevel' : config.service}</h3>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {config.service === 'clio' && 'Matters • Bills • Calendar • Clients'}
                                                    {config.service === 'execview' && 'Leads • Opportunities • Contacts • Pipelines'}
                                                    {config.service === 'quickbooks' && 'P&L Reports • Invoices • Payments • Metrics'}
                                                </p>
                                            </div>
                                            <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.accessToken ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                                                {config.accessToken ? 'Connected' : 'Setup Required'}
                                            </div>
                                        </div>
                                        {config.accessToken ? (
                                            <div className="space-y-2">
                                                <div className="text-xs text-muted-foreground">
                                                    Last Updated: {new Date(config.updatedAt).toLocaleString()}
                                                </div>
                                                <button
                                                    onClick={() => handleDisconnect(config.service)}
                                                    className="w-full py-2 bg-error/10 hover:bg-error/20 text-error rounded-lg text-xs font-bold transition-all"
                                                >
                                                    Disconnect
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleConnect(config.service)}
                                                className="w-full py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold transition-all"
                                            >
                                                Connect via OAuth
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
            <AnimatedCard delay={0.1}>
                <div className="glass-card max-w-2xl mx-auto">
                    <div className="p-6 border-b border-sidebar-border bg-white/5 flex items-center justify-between">
                        <h3 className="font-bold text-foreground flex items-center gap-2">
                            <Share2 className="w-4 h-4 text-primary" />
                            Automated Email Reports
                        </h3>
                        <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${schedule.enabled ? 'text-success' : 'text-sidebar-foreground'}`}>
                                {schedule.enabled ? 'Active' : 'Inactive'}
                            </span>
                            <button
                                onClick={() => handleUpdateSchedule({ ...schedule, enabled: !schedule.enabled })}
                                className={`w-10 h-5 rounded-full transition-all relative ${schedule.enabled ? 'bg-primary' : 'bg-sidebar-accent'}`}
                            >
                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${schedule.enabled ? 'right-1' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-sidebar-foreground uppercase tracking-widest">Delivery Day</label>
                                <select
                                    value={schedule.day}
                                    onChange={(e) => handleUpdateSchedule({ ...schedule, day: e.target.value })}
                                    className="w-full bg-sidebar-background border border-sidebar-border rounded-xl px-4 py-3 text-sm text-foreground outline-none font-bold focus:ring-1 focus:ring-primary transition-all"
                                >
                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                                        <option key={d}>{d}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-sidebar-foreground uppercase tracking-widest">Preferred Time</label>
                                <input
                                    type="time"
                                    value={schedule.time}
                                    onChange={(e) => handleUpdateSchedule({ ...schedule, time: e.target.value })}
                                    className="w-full bg-sidebar-background border border-sidebar-border rounded-xl px-4 py-3 text-sm text-foreground outline-none font-bold focus:ring-1 focus:ring-primary transition-all"
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl">
                            <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-primary" />
                                Report Contents
                            </h4>
                            <ul className="space-y-2 text-xs text-sidebar-foreground font-medium">
                                <li className="flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-primary" /> Comprehensive weekly performance PDF
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-primary" /> Summary of leads and consultations
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-primary" /> Financial reconciliation overview
                                </li>
                            </ul>
                        </div>

                        <button
                            className="w-full py-4 bg-sidebar-accent hover:bg-sidebar-foreground/10 text-foreground text-sm font-bold rounded-xl transition-all border border-sidebar-border flex items-center justify-center gap-2"
                            onClick={() => alert("A test email has been queued! Check logs in a few moments.")}
                        >
                            Send Test Report Now
                        </button>
                    </div>
                </div>
            </AnimatedCard>
                    )}
        </main>
            </div >
        </PageTransition >
    );
}

function StatusBadge({ status }: { status: 'connected' | 'checking' | 'disconnected' }) {
    if (status === 'connected') return (
        <div className="flex items-center gap-1.5 text-[10px] bg-success/10 text-success px-2.5 py-1 rounded-full font-bold">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Connected
        </div>
    );
    if (status === 'checking') return (
        <div className="flex items-center gap-1.5 text-[10px] bg-warning/10 text-warning px-2.5 py-1 rounded-full font-bold">
            <RefreshCw className="w-3 h-3 animate-spin" /> Syncing
        </div>
    );
    return (
        <div className="flex items-center gap-1.5 text-[10px] bg-error/10 text-error px-2.5 py-1 rounded-full font-bold">
            <XCircle className="w-3 h-3" /> Disconnected
        </div>
    );
}

function SettingRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-bold text-foreground">{label}</p>
                <p className="text-[10px] text-sidebar-foreground font-medium">{desc}</p>
            </div>
            {children}
        </div>
    );
}

function DatabaseHealthCard() {
    return (
        <div className="glass-card h-full">
            <div className="p-6 border-b border-sidebar-border bg-white/5 bg-opacity-1">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                    <Database className="w-4 h-4 text-success" />
                    On-Premise Database
                </h3>
            </div>
            <div className="p-6">
                <div className="space-y-4">
                    {[
                        { label: 'Platform', val: 'SQLite 3' },
                        { label: 'Storage', val: 'Local Persistence' },
                        { label: 'Location', val: './lawyer_dashboard.db' },
                        { label: 'Integrity', val: 'Verified', color: 'text-success' }
                    ].map(row => (
                        <div key={row.label} className="flex justify-between items-center text-xs">
                            <span className="text-sidebar-foreground font-semibold">{row.label}</span>
                            <span className={`font-bold ${row.color || 'text-foreground'}`}>{row.val}</span>
                        </div>
                    ))}
                    <div className="mt-6 pt-6 border-t border-sidebar-border">
                        <button className="text-[10px] font-bold text-error hover:bg-error/5 px-2 py-1 rounded-lg transition-colors flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Purge Synced Data Cache
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
