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

        // Test 4: Query Deposits (many law firms use this instead of formal payments)
        try {
            const depositResponse = await fetch(
                `${baseUrl}/${realmId}/query?query=SELECT * FROM Deposit MAXRESULTS 5`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json'
                    }
                }
            );

            const depositStatus = depositResponse.status;
            if (depositResponse.ok) {
                const depositData = await depositResponse.json();
                const deposits = depositData.QueryResponse?.Deposit || [];
                results.tests.deposits = {
                    status: depositStatus,
                    success: true,
                    count: deposits.length,
                    sample: deposits.slice(0, 2).map((dep: any) => ({
                        id: dep.Id,
                        amount: dep.TotalAmt,
                        date: dep.TxnDate,
                        account: dep.DepositToAccountRef?.name
                    }))
                };
            } else {
                results.tests.deposits = {
                    status: depositStatus,
                    success: false,
                    error: await depositResponse.text()
                };
            }
        } catch (e) {
            results.tests.deposits = {
                success: false,
                error: e instanceof Error ? e.message : String(e)
            };
        }

        // Test 5: Query Sales Receipts (immediate payments without invoices)
        try {
            const srResponse = await fetch(
                `${baseUrl}/${realmId}/query?query=SELECT * FROM SalesReceipt MAXRESULTS 5`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json'
                    }
                }
            );

            const srStatus = srResponse.status;
            if (srResponse.ok) {
                const srData = await srResponse.json();
                const salesReceipts = srData.QueryResponse?.SalesReceipt || [];
                results.tests.salesReceipts = {
                    status: srStatus,
                    success: true,
                    count: salesReceipts.length,
                    sample: salesReceipts.slice(0, 2).map((sr: any) => ({
                        id: sr.Id,
                        amount: sr.TotalAmt,
                        date: sr.TxnDate,
                        customer: sr.CustomerRef?.name
                    }))
                };
            } else {
                results.tests.salesReceipts = {
                    status: srStatus,
                    success: false,
                    error: await srResponse.text()
                };
            }
        } catch (e) {
            results.tests.salesReceipts = {
                success: false,
                error: e instanceof Error ? e.message : String(e)
            };
        }

        // Test 6: Profit & Loss Report
        try {
            const currentYear = new Date().getFullYear();
            const plResponse = await fetch(
                `${baseUrl}/${realmId}/reports/ProfitAndLoss?start_date=${currentYear}-01-01&end_date=${new Date().toISOString().split('T')[0]}&minorversion=65`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json'
                    }
                }
            );

            const plStatus = plResponse.status;
            if (plResponse.ok) {
                const plData = await plResponse.json();
                // Find total income from P&L
                let totalIncome = 0;
                let netIncome = 0;

                const findValue = (rows: any[], label: string): number => {
                    if (!rows) return 0;
                    for (const row of rows) {
                        if (row.Summary?.ColData) {
                            const rowLabel = row.Summary.ColData[0]?.value?.toLowerCase() || '';
                            if (rowLabel.includes(label)) {
                                return parseFloat(row.Summary.ColData[1]?.value?.replace(/[,$]/g, '') || '0');
                            }
                        }
                        if (row.Rows?.Row) {
                            const nested = findValue(row.Rows.Row, label);
                            if (nested !== 0) return nested;
                        }
                    }
                    return 0;
                };

                if (plData.Rows?.Row) {
                    totalIncome = findValue(plData.Rows.Row, 'total income');
                    netIncome = findValue(plData.Rows.Row, 'net income');
                }

                results.tests.profitAndLoss = {
                    status: plStatus,
                    success: true,
                    totalIncome,
                    netIncome,
                    reportPeriod: `${currentYear}-01-01 to ${new Date().toISOString().split('T')[0]}`
                };
            } else {
                results.tests.profitAndLoss = {
                    status: plStatus,
                    success: false,
                    error: await plResponse.text()
                };
            }
        } catch (e) {
            results.tests.profitAndLoss = {
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
