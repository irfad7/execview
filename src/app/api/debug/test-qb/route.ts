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

        // Get QuickBooks config
        const qbConfig = await prisma.apiConfig.findUnique({
            where: {
                service_userId: {
                    service: 'quickbooks',
                    userId: user.id
                }
            }
        });

        if (!qbConfig || !qbConfig.accessToken) {
            return NextResponse.json({
                error: "QuickBooks not connected",
                hasConfig: !!qbConfig,
                hasAccessToken: !!qbConfig?.accessToken,
                hasRealmId: !!qbConfig?.realmId
            }, { status: 400 });
        }

        const accessToken = qbConfig.accessToken;
        const realmId = qbConfig.realmId;
        const baseUrl = "https://quickbooks.api.intuit.com/v3/company";

        const results: any = {
            tokenInfo: {
                expiresAt: qbConfig.expiresAt ? new Date(qbConfig.expiresAt * 1000).toISOString() : null,
                hasRefreshToken: !!qbConfig.refreshToken,
                realmId: realmId
            },
            tests: {}
        };

        // Test 1: Company Info
        try {
            const companyResponse = await fetch(
                `${baseUrl}/${realmId}/companyinfo/${realmId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json'
                    }
                }
            );

            const companyStatus = companyResponse.status;
            if (companyResponse.ok) {
                const companyData = await companyResponse.json();
                results.tests.companyInfo = {
                    status: companyStatus,
                    success: true,
                    companyName: companyData.CompanyInfo?.CompanyName || "Unknown"
                };
            } else {
                results.tests.companyInfo = {
                    status: companyStatus,
                    success: false,
                    error: await companyResponse.text()
                };
            }
        } catch (e) {
            results.tests.companyInfo = {
                success: false,
                error: e instanceof Error ? e.message : String(e)
            };
        }

        // Test 2: Query Invoices
        try {
            const invoiceResponse = await fetch(
                `${baseUrl}/${realmId}/query?query=SELECT * FROM Invoice MAXRESULTS 5`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json'
                    }
                }
            );

            const invoiceStatus = invoiceResponse.status;
            if (invoiceResponse.ok) {
                const invoiceData = await invoiceResponse.json();
                const invoices = invoiceData.QueryResponse?.Invoice || [];
                results.tests.invoices = {
                    status: invoiceStatus,
                    success: true,
                    count: invoices.length,
                    sample: invoices.slice(0, 2).map((inv: any) => ({
                        id: inv.Id,
                        total: inv.TotalAmt,
                        date: inv.TxnDate,
                        customer: inv.CustomerRef?.name
                    }))
                };
            } else {
                results.tests.invoices = {
                    status: invoiceStatus,
                    success: false,
                    error: await invoiceResponse.text()
                };
            }
        } catch (e) {
            results.tests.invoices = {
                success: false,
                error: e instanceof Error ? e.message : String(e)
            };
        }

        // Test 3: Query Payments
        try {
            const paymentResponse = await fetch(
                `${baseUrl}/${realmId}/query?query=SELECT * FROM Payment MAXRESULTS 5`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json'
                    }
                }
            );

            const paymentStatus = paymentResponse.status;
            if (paymentResponse.ok) {
                const paymentData = await paymentResponse.json();
                const payments = paymentData.QueryResponse?.Payment || [];
                results.tests.payments = {
                    status: paymentStatus,
                    success: true,
                    count: payments.length,
                    sample: payments.slice(0, 2).map((pmt: any) => ({
                        id: pmt.Id,
                        amount: pmt.TotalAmt,
                        date: pmt.TxnDate,
                        customer: pmt.CustomerRef?.name
                    }))
                };
            } else {
                results.tests.payments = {
                    status: paymentStatus,
                    success: false,
                    error: await paymentResponse.text()
                };
            }
        } catch (e) {
            results.tests.payments = {
                success: false,
                error: e instanceof Error ? e.message : String(e)
            };
        }

        return NextResponse.json(results);

    } catch (error) {
        console.error("Debug test-qb error:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
