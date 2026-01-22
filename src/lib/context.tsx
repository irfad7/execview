"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { FirmMetrics } from "./types";
import { getLiveDashboardData } from "./dbActions";

interface DashboardState {
    data: FirmMetrics | null;
    loading: boolean;
    error: string | null;
}

const DashboardContext = createContext<DashboardState | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<DashboardState>({
        data: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                let result = await getLiveDashboardData();

                // If no cache but user is authenticated, try a fresh sync
                if (!result) {
                    console.log("No cached data found, attempting fresh sync...");
                    const { refreshDashboardData } = await import("./dbActions");
                    try {
                        result = await refreshDashboardData();
                        console.log("Fresh sync completed:", result ? "got data" : "no data");
                    } catch (syncError) {
                        console.error("Auto-sync failed:", syncError);
                        // Show error to user instead of silent failure
                        setState({
                            data: null,
                            loading: false,
                            error: `Sync failed: ${syncError instanceof Error ? syncError.message : 'Unknown error'}`,
                        });
                        return;
                    }
                }

                setState({
                    data: result,
                    loading: false,
                    error: null,
                });
            } catch (err) {
                console.error("Failed to fetch live data:", err);
                setState({
                    data: null,
                    loading: false,
                    error: "Failed to fetch dashboard data",
                });
            }
        };

        fetchData();
    }, []);

    return (
        <DashboardContext.Provider value={state}>
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboard() {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error("useDashboard must be used within a DashboardProvider");
    }
    return context;
}
