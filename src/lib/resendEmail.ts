import { Resend } from 'resend';
import { generateFirmMetricsEmailHtml, WeeklyReportEmailData } from '@/components/email/FirmMetricsEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

export type { WeeklyReportEmailData };

export interface SendResult {
    success: boolean;
    id?: string;
    error?: string;
}

export async function sendWeeklyFirmReport(
    to: string | string[],
    data: WeeklyReportEmailData
): Promise<SendResult> {
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'reports@updates.mylegalacademy.com';
    const subject = `Weekly Firm Metrics — ${data.weekRange}`;

    const { data: result, error } = await resend.emails.send({
        from: `${data.firmName} Reports <${fromAddress}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: generateFirmMetricsEmailHtml(data),
    });

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, id: result?.id };
}
