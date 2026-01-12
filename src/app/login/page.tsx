"use client";

import { useState } from "react";
import { Briefcase, Lock, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [password, setPassword] = useState("MLA@2026");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const router = useRouter();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            router.push('/');
            router.refresh();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 flex-col">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/40 mx-auto mb-6">
                        <Briefcase className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-foreground tracking-tight mb-2 font-display">ExecView</h1>
                    <p className="text-sidebar-foreground font-medium">Attorney Reporting Dashboard</p>
                </div>

                <div className="glass-card p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                    <form onSubmit={handleAuth} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-foreground mb-2 px-1">Access Password</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sidebar-foreground">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full bg-white/5 border border-sidebar-border rounded-xl py-3.5 pl-12 pr-4 text-foreground placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                    placeholder="Enter access password"
                                />
                            </div>
                        </div>

                        {message && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`text-xs font-bold px-3 py-2 rounded-lg ${message.type === 'error' ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}
                            >
                                {message.text}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    Sign In
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                            <p className="text-xs text-primary font-bold mb-2">My Legal Academy</p>
                            <p className="text-xs text-zinc-400">Single Firm System</p>
                            <p className="text-xs text-zinc-400">Default Password: MLA@2026</p>
                        </div>
                    </div>
                </div>

                <p className="text-center text-sidebar-foreground text-xs mt-8 font-medium">
                    My Legal Academy Portal
                </p>
            </motion.div>
        </div>
    );
}
