"use server";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { AuthService } from "@/lib/auth";
import { refreshToken } from "@/lib/tokenRefresh";

export async function GET() {
    try {
        // Get current user
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;

        if (!token) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const user = await AuthService.validateSession(token);
        if (!user) {
            return NextResponse.json({ error: "Invalid session" }, { status: 401 });
        }

        // Get Clio config
        const clioConfig = await prisma.apiConfig.findUnique({
            where: {
                service_userId: {
                    service: 'clio',
                    userId: user.id
                }
            }
        });

        if (!clioConfig || !clioConfig.refreshToken) {
            return NextResponse.json({
                error: "No Clio refresh token available",
                hasConfig: !!clioConfig,
                hasRefreshToken: !!clioConfig?.refreshToken
            }, { status: 400 });
        }

        // Try to refresh the token
        console.log("Attempting to refresh Clio token...");
        const newTokens = await refreshToken('clio', clioConfig.refreshToken);

        if (!newTokens) {
            return NextResponse.json({
                error: "Token refresh failed - refresh token may be revoked",
                suggestion: "User needs to reconnect Clio"
            }, { status: 400 });
        }

        // Update database with new tokens
        await prisma.apiConfig.update({
            where: {
                service_userId: {
                    service: 'clio',
                    userId: user.id
                }
            },
            data: {
                accessToken: newTokens.accessToken,
                refreshToken: newTokens.refreshToken,
                expiresAt: newTokens.expiresAt,
                updatedAt: new Date(),
            }
        });

        // Test the new token
        const testHeaders = {
            'Authorization': `Bearer ${newTokens.accessToken}`,
            'Content-Type': 'application/json'
        };

        // Test with simpler fields (no billing)
        const testResponse = await fetch(
            'https://app.clio.com/api/v4/matters.json?status=open&limit=5&fields=id,display_number,description,status,practice_area{id,name},client{id,name}',
            { headers: testHeaders }
        );

        const testStatus = testResponse.status;
        const testData = await testResponse.text();

        return NextResponse.json({
            success: true,
            message: "Token refreshed successfully!",
            newExpiresAt: new Date(newTokens.expiresAt * 1000).toISOString(),
            testApiCall: {
                status: testStatus,
                ok: testResponse.ok,
                data: testStatus === 200 ? JSON.parse(testData) : testData
            }
        });

    } catch (error) {
        console.error("Debug refresh-clio error:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
