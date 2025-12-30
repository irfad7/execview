"use client";

import { Bell, Search, User, LogOut, Settings, UserCircle, CheckCircle, List, FileText, Users as UsersIcon, ArrowRight } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";

export function Header({ title }: { title: string }) {
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearchResults, setShowSearchResults] = useState(false);
    const router = useRouter();
    const { signOut } = useAuth();

    const notificationRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    // Mock search data
    const searchableItems = useMemo(() => [
        { id: "1", title: "Smith v. Jones", type: "case", category: "Federal Civil" },
        { id: "2", title: "Robert Miller", type: "lead", category: "Personal Injury" },
        { id: "3", title: "Estate of Alice", type: "case", category: "Probate" },
        { id: "4", title: "James Wilson", type: "lead", category: "DUI Defense" },
    ], []);

    const filteredResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return searchableItems.filter(item =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, searchableItems]);

    // Close popovers on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSearchResults(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const notifications = [
        { id: 1, text: "Clio sync completed successfully", time: "2 mins ago", type: "success" },
        { id: 2, text: "New lead from GoHighLevel", time: "1 hour ago", type: "info" },
        { id: 3, text: "QuickBooks token expires in 3 days", time: "5 hours ago", type: "warning" },
    ];

    return (
        <header className="h-16 border-b border-sidebar-border flex items-center justify-between px-8 bg-background/50 backdrop-blur-md sticky top-0 z-40">
            <h2 className="text-xl font-semibold text-foreground tracking-tight">{title}</h2>

            <div className="flex items-center gap-6">
                {/* Search */}
                <div className="relative group" ref={searchRef}>
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowSearchResults(true);
                        }}
                        onFocus={() => setShowSearchResults(true)}
                        placeholder="Search for cases, leads..."
                        className="bg-sidebar-accent border-none rounded-full pl-10 pr-4 py-1.5 text-sm focus:ring-1 focus:ring-primary w-64 transition-all placeholder:text-zinc-600"
                    />

                    <AnimatePresence>
                        {showSearchResults && searchQuery.trim() !== "" && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute top-full left-0 mt-2 w-80 glass-card p-2 shadow-2xl z-50 overflow-hidden"
                            >
                                <div className="px-3 py-2 border-b border-sidebar-border mb-2 flex justify-between items-center">
                                    <p className="text-[10px] font-bold text-sidebar-foreground uppercase tracking-widest">Search Results</p>
                                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">{filteredResults.length} Found</span>
                                </div>

                                <div className="space-y-1">
                                    {filteredResults.length > 0 ? (
                                        filteredResults.map((result) => (
                                            <button
                                                key={result.id}
                                                onClick={() => {
                                                    router.push(result.type === 'case' ? '/cases' : '/leads');
                                                    setShowSearchResults(false);
                                                    setSearchQuery("");
                                                }}
                                                className="w-full flex items-center gap-3 p-3 hover:bg-sidebar-accent/50 rounded-lg transition-colors group text-left"
                                            >
                                                <div className="p-2 bg-sidebar-accent rounded-lg group-hover:bg-primary/20 transition-colors">
                                                    {result.type === 'case' ? <FileText className="w-4 h-4 text-primary" /> : <UsersIcon className="w-4 h-4 text-success" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{result.title}</p>
                                                    <p className="text-[10px] text-sidebar-foreground uppercase tracking-widest font-medium">{result.category}</p>
                                                </div>
                                                <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all text-primary" />
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center">
                                            <p className="text-sm text-sidebar-foreground">No matches found for "{searchQuery}"</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Notifications */}
                <div className="relative" ref={notificationRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`relative p-2 rounded-xl transition-all ${showNotifications ? 'bg-primary/10 text-primary' : 'text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent'}`}
                    >
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-background" />
                    </button>

                    <AnimatePresence>
                        {showNotifications && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 mt-2 w-80 glass-card p-2 shadow-2xl z-50 overflow-hidden"
                            >
                                <div className="px-4 py-3 border-b border-sidebar-border mb-2">
                                    <p className="text-xs font-bold text-foreground uppercase tracking-widest">Recent Notifications</p>
                                </div>
                                <div className="space-y-1">
                                    {notifications.map((n) => (
                                        <div key={n.id} className="p-3 hover:bg-sidebar-accent/50 rounded-lg transition-colors cursor-pointer group">
                                            <div className="flex gap-3">
                                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${n.type === 'success' ? 'bg-success' : n.type === 'warning' ? 'bg-warning' : 'bg-primary'}`} />
                                                <div>
                                                    <p className="text-sm text-foreground font-medium group-hover:text-primary transition-colors">{n.text}</p>
                                                    <p className="text-[10px] text-sidebar-foreground mt-0.5">{n.time}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Link
                                    href="/admin/logs"
                                    className="w-full flex items-center justify-center gap-2 py-2 mt-2 text-[10px] font-bold text-sidebar-foreground hover:text-foreground transition-colors uppercase tracking-widest bg-sidebar-accent/30 rounded-lg"
                                    onClick={() => setShowNotifications(false)}
                                >
                                    <List className="w-3 h-3" /> View System Logs
                                </Link>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

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
                                        JD
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-bold text-foreground truncate">John Doe</p>
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
