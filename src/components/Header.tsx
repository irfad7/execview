"use client";

import { User, LogOut, UserCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/lib/authContext";
import { DateFilterDropdown } from "@/components/DateFilterDropdown";

export function Header({ title }: { title: string }) {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const { signOut } = useAuth();
    const userMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="h-16 border-b border-sidebar-border flex items-center justify-between px-8 bg-background/50 backdrop-blur-md sticky top-0 z-40">
            <h2 className="text-xl font-semibold text-foreground tracking-tight">{title}</h2>

            <div className="flex items-center gap-6">
                <DateFilterDropdown />

                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${showUserMenu ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-sidebar-accent text-zinc-400 border-sidebar-border hover:border-sidebar-foreground/30'}`}
                    >
                        <User className="w-5 h-5" />
                    </button>

                    <AnimatePresence>
                        {showUserMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 mt-2 w-56 glass-card p-2 shadow-2xl z-50"
                            >
                                <div className="p-3 border-b border-sidebar-border mb-2 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                                        ST
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-bold text-foreground truncate">Shahnam Thompson</p>
                                        <p className="text-[10px] text-sidebar-foreground truncate">admin@firm.com</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Link
                                        href="/profile"
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent rounded-lg transition-all"
                                        onClick={() => setShowUserMenu(false)}
                                    >
                                        <UserCircle className="w-4 h-4" /> My Profile
                                    </Link>
                                    <div className="h-px bg-sidebar-border my-1" />
                                    <button
                                        onClick={() => signOut()}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-error hover:bg-error/10 rounded-lg transition-all font-bold"
                                    >
                                        <LogOut className="w-4 h-4" /> Sign Out
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
}
