"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type DateRange = "today" | "this_week" | "this_month" | "this_quarter" | "this_year" | "custom";

export interface DateFilter {
    range: DateRange;
    startDate: Date;
    endDate: Date;
    label: string;
}

interface DateFilterContextType {
    filter: DateFilter;
    setRange: (range: DateRange) => void;
    setCustomRange: (start: Date, end: Date) => void;
    isInRange: (date: string | Date) => boolean;
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

// Firm is based in Greenbelt, MD - use Eastern Time for all date calculations
const FIRM_TIMEZONE = "America/New_York";

function getEasternTimeNow(): Date {
    // Get current time in Eastern timezone
    const now = new Date();
    const easternTimeStr = now.toLocaleString("en-US", { timeZone: FIRM_TIMEZONE });
    return new Date(easternTimeStr);
}

function getDateRangeValues(range: DateRange): { start: Date; end: Date; label: string } {
    const now = getEasternTimeNow();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    switch (range) {
        case "today":
            return { start: today, end: endOfToday, label: "Today" };

        case "this_week": {
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
            return { start: startOfWeek, end: endOfToday, label: "This Week" };
        }

        case "this_month": {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            return { start: startOfMonth, end: endOfToday, label: "This Month" };
        }

        case "this_quarter": {
            const quarter = Math.floor(today.getMonth() / 3);
            const startOfQuarter = new Date(today.getFullYear(), quarter * 3, 1);
            return { start: startOfQuarter, end: endOfToday, label: "This Quarter" };
        }

        case "this_year": {
            const startOfYear = new Date(today.getFullYear(), 0, 1);
            return { start: startOfYear, end: endOfToday, label: "Year to Date" };
        }

        default:
            return { start: today, end: endOfToday, label: "Custom" };
    }
}

export function DateFilterProvider({ children }: { children: React.ReactNode }) {
    const [filter, setFilter] = useState<DateFilter>(() => {
        const { start, end, label } = getDateRangeValues("this_week");
        return { range: "this_week", startDate: start, endDate: end, label };
    });

    const setRange = useCallback((range: DateRange) => {
        const { start, end, label } = getDateRangeValues(range);
        setFilter({ range, startDate: start, endDate: end, label });
    }, []);

    const setCustomRange = useCallback((start: Date, end: Date) => {
        const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        setFilter({
            range: "custom",
            startDate: start,
            endDate: end,
            label: `${formatDate(start)} - ${formatDate(end)}`
        });
    }, []);

    const isInRange = useCallback((date: string | Date): boolean => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d >= filter.startDate && d <= filter.endDate;
    }, [filter.startDate, filter.endDate]);

    return (
        <DateFilterContext.Provider value={{ filter, setRange, setCustomRange, isInRange }}>
            {children}
        </DateFilterContext.Provider>
    );
}

export function useDateFilter() {
    const context = useContext(DateFilterContext);
    if (context === undefined) {
        throw new Error("useDateFilter must be used within a DateFilterProvider");
    }
    return context;
}
