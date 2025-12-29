"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BarChart2,
    Briefcase,
    BookOpen,
    Users,
    LayoutDashboard,
    LogOut,
    Sun,
    Moon,
    Settings,
    Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/themeContext";
import { useAuth } from "@/lib/authContext";

const menuItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/" },
    { icon: Briefcase, label: "Case Management", href: "/cases" },
    { icon: BarChart2, label: "Firm Metrics", href: "/metrics" },
    { icon: BookOpen, label: "Bookkeeping", href: "/bookkeeping" },
    { icon: Users, label: "Leads Tracking", href: "/leads" },
    { icon: Database, label: "Integrations", href: "/integrations" }, // Added
    { icon: Settings, label: "Admin Panel", href: "/admin" },
];

export function Sidebar() {
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();
    const { logout, isAuthenticated } = useAuth();

    if (!isAuthenticated) return null;

    return (
        <aside className="w-72 bg-sidebar h-screen flex flex-col border-r border-sidebar-border sticky top-0 transition-colors duration-300">
            <div className="p-8">
                <div className="flex items-center gap-3 group">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                        <Briefcase className="text-white w-6 h-6" />
                    </div>
                    <span className="text-xl font-extrabold text-foreground tracking-tight font-display">ExecView</span>
                </div>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group relative",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-sidebar-foreground group-hover:text-sidebar-accent-foreground")} />
                            <span className="font-semibold text-sm">{item.label}</span>
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[2px_0_10px_rgba(99,102,241,0.5)]" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-6 border-t border-sidebar-border space-y-2">
                <button
                    onClick={toggleTheme}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 font-semibold text-sm"
                >
                    {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </button>

                <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sidebar-foreground hover:bg-error/10 hover:text-error transition-all duration-200 font-semibold text-sm"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
}
