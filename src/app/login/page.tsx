"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Briefcase, Lock, ArrowRight, Mail, Loader2, Link } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${location.origin}/api/auth/callback`,
                    },
                });
                if (error) throw error;
                setMessage({ type: 'success', text: 'Check your email for the confirmation link!' });
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push('/');
                router.refresh();
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleMagicLink = async () => {
        if (!email) {
            setMessage({ type: 'error', text: 'Please enter your email first.' });
            return;
        }
        setLoading(true);
        setMessage(null);
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${location.origin}/api/auth/callback`,
                },
            });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Check your email for the magic link!' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    }

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
                            <label className="block text-sm font-bold text-foreground mb-2 px-1">Email Address</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sidebar-foreground">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full bg-white/5 border border-sidebar-border rounded-xl py-3.5 pl-12 pr-4 text-foreground placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                    placeholder="name@firm.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-foreground mb-2 px-1">Password</label>
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
                                    placeholder="Create or enter password"
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
                                    {isSignUp ? 'Create Account' : 'Sign In'}
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 flex flex-col gap-4">
                        <button
                            type="button"
                            onClick={handleMagicLink}
                            disabled={loading}
                            className="w-full py-2 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            <Link className="w-3 h-3" />
                            Email me a Magic Link instead
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-sidebar-border" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-sidebar-foreground font-bold">Or</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
                            className="text-xs text-sidebar-foreground hover:text-foreground transition-colors font-bold text-center"
                        >
                            {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
                        </button>
                    </div>
                </div>

                <p className="text-center text-sidebar-foreground text-xs mt-8 font-medium">
                    Secured by Supabase Authentication
                </p>
            </motion.div>
        </div>
    );
}
