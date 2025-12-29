"use client";

import { WeeklyReportEmail } from "@/components/email/WeeklyReportEmail";
import { Header } from "@/components/Header";
import { PageTransition } from "@/lib/animations";

export default function EmailPreviewPage() {
    const dummyData = {
        userName: "John Doe",
        firmName: "Doe Law Firm",
        dateRange: "Dec 16 - Dec 23, 2025",
        metrics: {
            revenue: 45200,
            leads: 124,
            conversion: 18.5
        }
    };

    return (
        <PageTransition>
            <div className="flex-1 flex flex-col bg-zinc-950 min-h-screen">
                <Header title="Email Template Preview" />

                <main className="p-8 flex flex-col items-center">
                    <div className="mb-8 text-center">
                        <h2 className="text-xl font-bold text-white mb-2">Weekly Report Email Template</h2>
                        <p className="text-zinc-400 text-sm">This is how the automated weekly report will look in your inbox.</p>
                    </div>

                    <div className="border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                        <WeeklyReportEmail {...dummyData} />
                    </div>

                    <div className="mt-8 p-6 bg-primary/10 border border-primary/20 rounded-2xl max-w-xl">
                        <p className="text-xs text-primary font-bold uppercase tracking-widest mb-2">Integration Note</p>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                            This template is responsive and designed for dark-mode mail clients. When sent automatically,
                            it will include a high-resolution PDF attachment of your main analytics dashboard.
                        </p>
                    </div>
                </main>
            </div>
        </PageTransition>
    );
}
