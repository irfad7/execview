"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { ArrowRight, Save } from "lucide-react";

interface FieldMappingProps {
    service: string;
    fields: { id: string; label: string; currentMapping?: string }[];
    onSave: (mappings: Record<string, string>) => void;
}

export function FieldMapper({ service, fields, onSave }: FieldMappingProps) {
    const [mappings, setMappings] = useState<Record<string, string>>(
        Object.fromEntries(fields.map(f => [f.id, f.currentMapping || ""]))
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-foreground">{service} Field Mapping</h4>
                <button
                    onClick={() => onSave(mappings)}
                    className="flex items-center gap-2 px-4 py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-primary/90 transition-all"
                >
                    <Save className="w-3 h-3" /> Save Mappings
                </button>
            </div>

            <div className="space-y-3">
                {fields.map((field) => (
                    <div key={field.id} className="flex items-center gap-4 bg-sidebar-accent/50 p-3 rounded-xl border border-sidebar-border">
                        <div className="flex-1">
                            <p className="text-[10px] text-sidebar-foreground uppercase tracking-widest font-bold">Dashboard Field</p>
                            <p className="text-sm font-bold text-foreground">{field.label}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-sidebar-foreground opacity-30" />
                        <div className="flex-1">
                            <p className="text-[10px] text-sidebar-foreground uppercase tracking-widest font-bold">Source API Field</p>
                            <input
                                type="text"
                                value={mappings[field.id]}
                                onChange={(e) => setMappings(prev => ({ ...prev, [field.id]: e.target.value }))}
                                placeholder="e.g. custom_field_123"
                                className="w-full bg-sidebar-background border-none rounded px-2 py-1 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
