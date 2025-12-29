"use client";

import { useState } from "react";
import { useAuth } from "@/lib/authContext";
import { Briefcase, Lock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState(false);
    const { login } = useAuth();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const success = login(password);
        if (!success) {
            setError(true);
            setTimeout(() => setError(false), 2000);
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
                    <h1 className="text-4xl font-extrabold text-foreground tracking-tight mb-2 font-display">LexPortal</h1>
                    <p className="text-sidebar-foreground font-medium">Attorney Reporting Dashboard</p>
                </div>

                <div className="glass-card p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-foreground mb-2 px-1">Firm Password</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sidebar-foreground">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full bg-white/5 border ${error ? 'border-error/50 ring-2 ring-error/20' : 'border-sidebar-border'} rounded-xl py-3.5 pl-12 pr-4 text-foreground placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium`}
                                    placeholder="Enter access code..."
                                    autoFocus
                                />
                            </div>
                            {error && (
                                <motion.p
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-error text-xs font-bold mt-2 px-1"
                                >
                                    Invalid access code. Please try again.
                                </motion.p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group"
                        >
                            Unlock Dashboard
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>
                </div>

                <p className="text-center text-sidebar-foreground text-xs mt-8 font-medium">
                    Confidential Material. For Authorized Firm Personnel Only.
                </p>
            </motion.div>
        </div>
    );
}
