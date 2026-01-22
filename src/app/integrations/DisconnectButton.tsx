"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";

export function DisconnectButton({ service }: { service: string }) {
    const router = useRouter();

    const handleDisconnect = async () => {
        if (!confirm(`Are you sure you want to disconnect ${service}?`)) {
            return;
        }

        try {
            const { disconnectService } = await import("@/lib/dbActions");
            await disconnectService(service);
            router.refresh();
        } catch (error) {
            console.error("Failed to disconnect:", error);
            alert("Failed to disconnect. Please try again.");
        }
    };

    return (
        <button
            onClick={handleDisconnect}
            className="flex items-center text-sm font-medium text-error hover:underline"
            title="Disconnect"
        >
            Disconnect <X className="w-4 h-4 ml-1" />
        </button>
    );
}
