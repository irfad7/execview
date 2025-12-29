"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { FirmMetrics } from "./types";
import { getMockData } from "./mockData";

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
                const result = await getMockData();
                setState({
                    data: result,
                    loading: false,
                    error: null,
                });
            } catch (err) {
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
