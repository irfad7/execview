"use client";

import { ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface CardProps {
    children: ReactNode;
    className?: string;
}

export function Card({ children, className }: CardProps) {
    return (
        <div className={cn("glass-card p-6", className)}>
            {children}
        </div>
    );
}

interface MetricCardProps {
    title: string;
    value: string | number;
    subValue?: string;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
    icon?: ReactNode;
    loading?: boolean;
}

export function MetricCard({
    title,
    value,
    subValue,
    trend,
    trendValue,
    icon,
    loading
}: MetricCardProps) {
    if (loading) {
        return (
            <Card className="animate-pulse">
                <div className="h-4 bg-sidebar-accent rounded w-1/2 mb-4" />
                <div className="h-8 bg-sidebar-accent rounded w-3/4" />
            </Card>
        );
    }

    return (
        <Card className="flex flex-col gap-1 hover:border-primary/50 transition-colors duration-300">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-400">{title}</span>
                {icon && <div className="text-zinc-500">{icon}</div>}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-bold text-foreground">{value}</h3>
                {trend && (
                    <span className={cn(
                        "text-xs font-semibold px-1.5 py-0.5 rounded",
                        trend === "up" ? "bg-success/10 text-success" :
                            trend === "down" ? "bg-error/10 text-error" :
                                "bg-sidebar-accent text-sidebar-foreground"
                    )}>
                        {trend === "up" ? "+" : trend === "down" ? "-" : ""}{trendValue}
                    </span>
                )}
            </div>
            {subValue && <span className="text-xs text-zinc-500 mt-1">{subValue}</span>}
        </Card>
    );
}
