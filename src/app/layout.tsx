import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { DashboardProvider } from "@/lib/context";
import { ThemeProvider } from "@/lib/themeContext";
import { AuthProvider } from "@/lib/authContext";
import { DateFilterProvider } from "@/lib/dateFilterContext";

export const metadata: Metadata = {
    title: "ExecView",
    description: "Executive reporting dashboard for modern law firms",
    metadataBase: new URL("https://execview.mylegalacademy.com"),
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <ThemeProvider>
                    <AuthProvider>
                        <DateFilterProvider>
                            <DashboardProvider>
                                <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
                                    <Sidebar />
                                    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                                        <div className="flex-1 overflow-y-auto">
                                            {children}
                                        </div>
                                        <footer className="h-10 border-t border-sidebar-border bg-sidebar-background/50 backdrop-blur-sm flex items-center justify-between px-8 text-[10px] font-bold text-sidebar-foreground uppercase tracking-widest shrink-0">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                                System Operational
                                            </div>
                                            <div>
                                                ExecView v1.0
                                            </div>
                                        </footer>
                                    </div>
                                </div>
                            </DashboardProvider>
                        </DateFilterProvider>
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
