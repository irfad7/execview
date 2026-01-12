"use client";

import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { User, Mail, Building2, Phone, Save, ArrowLeft, Lock, Key } from "lucide-react";
import { PageTransition, AnimatedCard } from "@/lib/animations";
import { useState, useEffect } from "react";
import { getProfile, updateProfile } from "@/lib/dbActions";
import Link from "next/link";

export default function ProfilePage() {
    const [profile, setProfile] = useState<{ name: string; firmName: string; email: string; phone: string }>({
        name: "",
        firmName: "",
        email: "",
        phone: ""
    });
    const [passwordChange, setPasswordChange] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    useEffect(() => {
        getProfile().then(p => {
            if (p) {
                setProfile({
                    name: p.name || "",
                    firmName: p.firmName || "",
                    email: p.email || "",
                    phone: p.phone || ""
                });
            }
        });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);
        try {
            await updateProfile(profile);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update profile' });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsChangingPassword(true);
        setMessage(null);

        if (passwordChange.newPassword !== passwordChange.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            setIsChangingPassword(false);
            return;
        }

        if (passwordChange.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'New password must be at least 6 characters long' });
            setIsChangingPassword(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: passwordChange.currentPassword,
                    newPassword: passwordChange.newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to change password');
            }

            setMessage({ type: 'success', text: 'Password changed successfully!' });
            setPasswordChange({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsChangingPassword(false);
        }
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

                    {message && (
                        <div className={`p-4 rounded-xl ${message.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                            {message.text}
                        </div>
                    )}

                    <AnimatedCard>
                        <div className="glass-card p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <User className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-bold text-foreground">Profile Information</h3>
                            </div>
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
                                                value={profile.firmName}
                                                onChange={e => setProfile({ ...profile, firmName: e.target.value })}
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

                    <AnimatedCard>
                        <div className="glass-card p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <Lock className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-bold text-foreground">Change Password</h3>
                            </div>
                            <form onSubmit={handlePasswordChange} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-sidebar-foreground uppercase tracking-widest pl-1">Current Password</label>
                                        <div className="relative">
                                            <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sidebar-foreground" />
                                            <input
                                                type="password"
                                                value={passwordChange.currentPassword}
                                                onChange={e => setPasswordChange({ ...passwordChange, currentPassword: e.target.value })}
                                                className="w-full bg-sidebar-background border border-sidebar-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-all"
                                                placeholder="Enter current password"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-sidebar-foreground uppercase tracking-widest pl-1">New Password</label>
                                            <div className="relative">
                                                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sidebar-foreground" />
                                                <input
                                                    type="password"
                                                    value={passwordChange.newPassword}
                                                    onChange={e => setPasswordChange({ ...passwordChange, newPassword: e.target.value })}
                                                    className="w-full bg-sidebar-background border border-sidebar-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-all"
                                                    placeholder="Enter new password"
                                                    required
                                                    minLength={6}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-sidebar-foreground uppercase tracking-widest pl-1">Confirm New Password</label>
                                            <div className="relative">
                                                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sidebar-foreground" />
                                                <input
                                                    type="password"
                                                    value={passwordChange.confirmPassword}
                                                    onChange={e => setPasswordChange({ ...passwordChange, confirmPassword: e.target.value })}
                                                    className="w-full bg-sidebar-background border border-sidebar-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-all"
                                                    placeholder="Confirm new password"
                                                    required
                                                    minLength={6}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isChangingPassword}
                                    className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all disabled:opacity-50 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                                >
                                    <Key className="w-4 h-4" />
                                    {isChangingPassword ? "Changing Password..." : "Change Password"}
                                </button>
                            </form>
                        </div>
                    </AnimatedCard>
                </main>
            </div>
        </PageTransition>
    );
}
