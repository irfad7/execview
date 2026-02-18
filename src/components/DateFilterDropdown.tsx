"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Calendar, ChevronDown, Check, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDateFilter, DateRange } from "@/lib/dateFilterContext";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "this_week", label: "This Week" },
    { value: "this_month", label: "This Month" },
    { value: "this_quarter", label: "This Quarter" },
    { value: "this_year", label: "Year to Date" },
    { value: "all_time", label: "All Time" },
];

export function DateFilterDropdown() {
    const { filter, setRange, setCustomRange } = useDateFilter();
    const [showDropdown, setShowDropdown] = useState(false);
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    const [easternTime, setEasternTime] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Update Eastern time display every minute
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const timeStr = now.toLocaleString("en-US", {
                timeZone: "America/New_York",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
                month: "short",
                day: "numeric"
            });
            setEasternTime(timeStr);
        };
        updateTime();
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
                setShowCustomPicker(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleRangeSelect = (range: DateRange) => {
        if (range === "custom") {
            setShowCustomPicker(true);
        } else {
            setRange(range);
            setShowDropdown(false);
        }
    };

    const handleCustomApply = () => {
        if (customStart && customEnd) {
            const start = new Date(customStart);
            const end = new Date(customEnd);
            end.setHours(23, 59, 59, 999);
            setCustomRange(start, end);
            setShowDropdown(false);
            setShowCustomPicker(false);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                    showDropdown
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-sidebar-accent border-sidebar-border text-sidebar-foreground hover:text-foreground hover:border-sidebar-foreground/30"
                }`}
            >
                <Calendar className="w-4 h-4" />
                <span>{filter.label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
                {showDropdown && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-56 glass-card p-2 shadow-2xl z-50"
                    >
                        <div className="px-3 py-2 border-b border-sidebar-border mb-2">
                            <p className="text-[10px] font-bold text-sidebar-foreground uppercase tracking-widest">
                                Date Range
                            </p>
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-sidebar-foreground/70">
                                <Clock className="w-3 h-3" />
                                <span>Eastern Time: {easternTime}</span>
                            </div>
                        </div>

                        {!showCustomPicker ? (
                            <div className="space-y-1">
                                {DATE_RANGE_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => handleRangeSelect(option.value)}
                                        className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all ${
                                            filter.range === option.value
                                                ? "bg-primary/10 text-primary font-bold"
                                                : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                                        }`}
                                    >
                                        <span>{option.label}</span>
                                        {filter.range === option.value && <Check className="w-4 h-4" />}
                                    </button>
                                ))}

                                <div className="h-px bg-sidebar-border my-2" />

                                <button
                                    onClick={() => handleRangeSelect("custom")}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all ${
                                        filter.range === "custom"
                                            ? "bg-primary/10 text-primary font-bold"
                                            : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                                    }`}
                                >
                                    <span>Custom Range...</span>
                                    {filter.range === "custom" && <Check className="w-4 h-4" />}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3 p-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-sidebar-foreground uppercase tracking-widest mb-1">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={customStart}
                                        onChange={(e) => setCustomStart(e.target.value)}
                                        className="w-full px-3 py-2 text-sm bg-sidebar-accent border border-sidebar-border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-sidebar-foreground uppercase tracking-widest mb-1">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={customEnd}
                                        onChange={(e) => setCustomEnd(e.target.value)}
                                        className="w-full px-3 py-2 text-sm bg-sidebar-accent border border-sidebar-border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowCustomPicker(false)}
                                        className="flex-1 px-3 py-2 text-sm text-sidebar-foreground hover:text-foreground bg-sidebar-accent rounded-lg transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCustomApply}
                                        disabled={!customStart || !customEnd}
                                        className="flex-1 px-3 py-2 text-sm text-white bg-primary rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-all"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
