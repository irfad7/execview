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

        // Get GHL config
        const ghlConfig = await prisma.apiConfig.findUnique({
            where: {
                service_userId: {
                    service: 'execview',
                    userId: user.id
                }
            }
        });

        if (!ghlConfig) {
            return NextResponse.json({ error: "GHL not configured" }, { status: 400 });
        }

        if (!ghlConfig.accessToken) {
            return NextResponse.json({ error: "GHL access token missing" }, { status: 400 });
        }

        if (!ghlConfig.realmId) {
            return NextResponse.json({ error: "GHL locationId (realmId) is NULL - this is the problem!" }, { status: 400 });
        }

        const results: any = {
            config: {
                hasToken: !!ghlConfig.accessToken,
                locationId: ghlConfig.realmId,
                tokenPreview: ghlConfig.accessToken.substring(0, 30) + '...'
            },
            apiTests: {}
        };

        const headers = {
            'Authorization': `Bearer ${ghlConfig.accessToken}`,
            'Version': '2021-04-15',
            'Content-Type': 'application/json'
        };

        // Test 1: Verify location
        try {
            const locationResponse = await fetch(
                `https://services.leadconnectorhq.com/locations/${ghlConfig.realmId}`,
                { headers }
            );
            const locationStatus = locationResponse.status;
            const locationData = await locationResponse.text();
            results.apiTests.location = {
                status: locationStatus,
                ok: locationResponse.ok,
                data: locationStatus === 200 ? JSON.parse(locationData) : locationData
            };
        } catch (e) {
            results.apiTests.location = { error: e instanceof Error ? e.message : "Unknown error" };
        }

        // Test 2: Fetch opportunities
        try {
            const oppResponse = await fetch(
                `https://services.leadconnectorhq.com/opportunities/search?location_id=${ghlConfig.realmId}&limit=10`,
                { headers }
            );
            const oppStatus = oppResponse.status;
            const oppData = await oppResponse.text();
            results.apiTests.opportunities = {
                status: oppStatus,
                ok: oppResponse.ok,
                data: oppStatus === 200 ? JSON.parse(oppData) : oppData
            };
        } catch (e) {
            results.apiTests.opportunities = { error: e instanceof Error ? e.message : "Unknown error" };
        }

        // Test 3: Fetch contacts
        try {
            const contactsResponse = await fetch(
                `https://services.leadconnectorhq.com/contacts/?locationId=${ghlConfig.realmId}&limit=10`,
                { headers }
            );
            const contactsStatus = contactsResponse.status;
            const contactsData = await contactsResponse.text();
            results.apiTests.contacts = {
                status: contactsStatus,
                ok: contactsResponse.ok,
                data: contactsStatus === 200 ? JSON.parse(contactsData) : contactsData
            };
        } catch (e) {
            results.apiTests.contacts = { error: e instanceof Error ? e.message : "Unknown error" };
        }

        return NextResponse.json(results);

    } catch (error) {
        console.error("Debug test-ghl error:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
