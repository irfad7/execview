import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth";
import { GHLService } from "@/lib/ghl-service";

export async function GET(request: NextRequest) {
    try {
        // Get the authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: "Missing or invalid authorization header" },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7); // Remove 'Bearer '
        
        // Validate session
        const user = await AuthService.validateSession(token);
        if (!user) {
            return NextResponse.json(
                { error: "Invalid session token" },
                { status: 401 }
            );
        }

        // Initialize GHL service
        const ghlService = new GHLService(user.id);

        // Get metrics
        const result = await ghlService.getMetrics();

        if (result.success) {
            return NextResponse.json({
                success: true,
                data: result.data
            });
        } else {
            return NextResponse.json(
                {
                    success: false,
                    error: result.error?.message || "Failed to get metrics",
                    code: result.error?.code || "UNKNOWN_ERROR"
                },
                { status: 400 }
            );
        }

    } catch (error) {
        console.error("GHL metrics API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}