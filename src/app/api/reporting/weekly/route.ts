import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getProfile, addLog, getSystemSetting } from '@/lib/dbActions';

export async function POST() {
    try {
        const profile = await getProfile();
        const schedule = await getSystemSetting("reporting_schedule");

        if (!schedule || !schedule.enabled) {
            return NextResponse.json({ message: "Reporting is disabled" });
        }

        // Setup transporter (use environment variables)
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT || '587'),
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Mock metrics for the email
        const metrics = {
            revenue: 45200,
            leads: 124,
            conversion: 18.5
        };

        const mailOptions = {
            from: `"Reporting Portal" <${process.env.EMAIL_USER}>`,
            to: profile.email,
            subject: `Weekly Performance Report - ${profile.firm_name}`,
            text: `Hello ${profile.name}, your weekly report is attached.`,
            html: `
                <div style="font-family: sans-serif; background: #09090b; color: white; padding: 40px; border-radius: 20px;">
                    <h1 style="color: #6366f1;">Weekly Report: ${profile.firm_name}</h1>
                    <p>Hello ${profile.name},</p>
                    <p>Your performance report for this week is ready.</p>
                    <ul>
                        <li>Revenue: $${metrics.revenue.toLocaleString()}</li>
                        <li>New Leads: ${metrics.leads}</li>
                        <li>Conversion Rate: ${metrics.conversion}%</li>
                    </ul>
                    <p>Best regards,<br/>Reporting Portal</p>
                </div>
            `,
            // In a real app, we'd generate a PDF server-side and attach it here
            // attachments: [{ filename: 'Weekly_Report.pdf', content: pdfBuffer }]
        };

        // For now, if no credentials, we log success and return
        if (!process.env.EMAIL_USER) {
            await addLog("EmailSystem", "info", "Weekly report generated but not sent (SMTP not configured)", JSON.stringify(metrics));
            return NextResponse.json({ message: "Report generated successfully (Log entry created)" });
        }

        await transporter.sendMail(mailOptions);
        await addLog("EmailSystem", "success", `Weekly report sent to ${profile.email}`);

        return NextResponse.json({ message: "Report sent successfully" });
    } catch (error: any) {
        console.error("Email Error:", error);
        await addLog("EmailSystem", "error", `Failed to send weekly report: ${error.message}`);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
