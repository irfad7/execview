"use server";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { AuthService } from "@/lib/auth";

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

        if (!clioConfig) {
            return NextResponse.json({ error: "Clio not configured" }, { status: 400 });
        }

        if (!clioConfig.accessToken) {
            return NextResponse.json({ error: "Clio access token missing" }, { status: 400 });
        }

        const results: any = {
            config: {
                hasToken: !!clioConfig.accessToken,
                hasRefreshToken: !!clioConfig.refreshToken,
                expiresAt: clioConfig.expiresAt,
                expiresAtHuman: clioConfig.expiresAt ? new Date(clioConfig.expiresAt * 1000).toISOString() : 'no expiry set',
                isExpired: clioConfig.expiresAt ? (clioConfig.expiresAt * 1000) < Date.now() : 'no expiry set',
                tokenPreview: clioConfig.accessToken.substring(0, 30) + '...'
            },
            apiTests: {}
        };

        const headers = {
            'Authorization': `Bearer ${clioConfig.accessToken}`,
            'Content-Type': 'application/json'
        };

        // Test 1: Who am I (verify token)
        try {
            const whoAmIResponse = await fetch(
                'https://app.clio.com/api/v4/users/who_am_i.json',
                { headers }
            );
            const status = whoAmIResponse.status;
            const data = await whoAmIResponse.text();
            results.apiTests.whoAmI = {
                status,
                ok: whoAmIResponse.ok,
                data: status === 200 ? JSON.parse(data) : data
            };
        } catch (e) {
            results.apiTests.whoAmI = { error: e instanceof Error ? e.message : "Unknown error" };
        }

        // Test 2: Fetch matters (minimal fields - should work with just matters:read)
        try {
            const mattersResponse = await fetch(
                'https://app.clio.com/api/v4/matters.json?status=open&limit=10&fields=id,display_number,description,status,client{id,name}',
                { headers }
            );
            const status = mattersResponse.status;
            const data = await mattersResponse.text();
            results.apiTests.mattersMinimal = {
                status,
                ok: mattersResponse.ok,
                count: status === 200 ? JSON.parse(data).data?.length : 0,
                sample: status === 200 ? JSON.parse(data).data?.slice(0, 2) : data
            };
        } catch (e) {
            results.apiTests.mattersMinimal = { error: e instanceof Error ? e.message : "Unknown error" };
        }

        // Test 2b: Fetch matters with billing fields (requires bills:read scope)
        try {
            const mattersResponse = await fetch(
                'https://app.clio.com/api/v4/matters.json?status=open&limit=10&fields=id,display_number,outstanding_balance',
                { headers }
            );
            const status = mattersResponse.status;
            const data = await mattersResponse.text();
            results.apiTests.mattersWithBilling = {
                status,
                ok: mattersResponse.ok,
                note: status === 400 ? "bills:read scope may not be enabled in Clio Developer Portal" : undefined,
                data: status === 200 ? JSON.parse(data).data?.slice(0, 2) : data
            };
        } catch (e) {
            results.apiTests.mattersWithBilling = { error: e instanceof Error ? e.message : "Unknown error" };
        }

        // Test 3: Fetch calendar entries
        try {
            const now = new Date();
            const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            const calResponse = await fetch(
                `https://app.clio.com/api/v4/calendar_entries.json?start_at_gte=${now.toISOString()}&start_at_lte=${futureDate.toISOString()}&fields=id,summary,start_at,matter{id,display_number}&limit=10`,
                { headers }
            );
            const status = calResponse.status;
            const data = await calResponse.text();
            results.apiTests.calendar = {
                status,
                ok: calResponse.ok,
                count: status === 200 ? JSON.parse(data).data?.length : 0,
                sample: status === 200 ? JSON.parse(data).data?.slice(0, 2) : data
            };
        } catch (e) {
            results.apiTests.calendar = { error: e instanceof Error ? e.message : "Unknown error" };
        }

        return NextResponse.json(results);

    } catch (error) {
        console.error("Debug test-clio error:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
