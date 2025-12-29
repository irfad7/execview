"use client";

import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { User, Mail, Building2, Phone, Save, ArrowLeft } from "lucide-react";
import { PageTransition, AnimatedCard } from "@/lib/animations";
import { useState, useEffect } from "react";
import { getProfile, updateProfile } from "@/lib/dbActions";
import Link from "next/link";

export default function ProfilePage() {
    const [profile, setProfile] = useState({
        name: "",
        firm_name: "",
        email: "",
        phone: ""
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        getProfile().then(p => {
            if (p) setProfile(p);
        });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await updateProfile(profile);
        setIsSaving(false);
        alert("Profile updated successfully!");
    };

    return (
        <PageTransition>
            <div className="flex-1 flex flex-col">
                <Header title="User Profile" />

                <main className="p-8 max-w-2xl mx-auto w-full space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <Link href="/" className="text-xs font-bold text-primary flex items-center gap-1 mb-2 hover:underline">
                                <ArrowLeft className="w-3 h-3" /> Back to Dashboard
                            </Link>
                            <h2 className="text-2xl font-bold text-foreground font-display tracking-tight">Account Settings</h2>
                            <p className="text-sidebar-foreground text-sm font-medium">Manage your personal and firm information</p>
                        </div>
                    </div>

                    <AnimatedCard>
                        <div className="glass-card p-8">
                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-sidebar-foreground uppercase tracking-widest pl-1">Full Name</label>
                                        <div className="relative">
                                            <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sidebar-foreground" />
                                            <input
                                                type="text"
                                                value={profile.name}
                                                onChange={e => setProfile({ ...profile, name: e.target.value })}
                                                className="w-full bg-sidebar-background border border-sidebar-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-all"
                                                placeholder="e.g. John Doe"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-sidebar-foreground uppercase tracking-widest pl-1">Firm Name</label>
                                        <div className="relative">
                                            <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sidebar-foreground" />
                                            <input
                                                type="text"
                                                value={profile.firm_name}
                                                onChange={e => setProfile({ ...profile, firm_name: e.target.value })}
                                                className="w-full bg-sidebar-background border border-sidebar-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-all"
                                                placeholder="e.g. Acme Law"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-sidebar-foreground uppercase tracking-widest pl-1">Email Address</label>
                                            <div className="relative">
                                                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sidebar-foreground" />
                                                <input
                                                    type="email"
                                                    value={profile.email}
                                                    onChange={e => setProfile({ ...profile, email: e.target.value })}
                                                    className="w-full bg-sidebar-background border border-sidebar-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-all"
                                                    placeholder="admin@firm.com"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-sidebar-foreground uppercase tracking-widest pl-1">Phone Number</label>
                                            <div className="relative">
                                                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sidebar-foreground" />
                                                <input
                                                    type="tel"
                                                    value={profile.phone}
                                                    onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                                    className="w-full bg-sidebar-background border border-sidebar-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-all"
                                                    placeholder="555-0123"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-4"
                                >
                                    <Save className="w-4 h-4" />
                                    {isSaving ? "Saving Changes..." : "Save Profile Information"}
                                </button>
                            </form>
                        </div>
                    </AnimatedCard>
                </main>
            </div>
        </PageTransition>
    );
}
