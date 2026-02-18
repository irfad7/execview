export interface WeeklyReportEmailData {
    firmName: string;
    userName: string;
    weekRange: string;        // e.g. "Feb 10 – Feb 16, 2026"
    yearLabel: string;        // e.g. "2026"

    // Revenue
    revenueWeekly: number;
    revenueYTD: number;

    // New Leads
    leadsWeekly: number;
    leadsYTD: number;

    // Conversion (as percentages 0–100)
    consultsPerLeadRate: number;
    retainersPerConsultRate: number;

    // Marketing ROI
    adSpendYTD: number;
    feesCollectedYTD: number;
    roiPercent: number;           // YTD only
    costPerAcquisition: number;   // $ per signed retainer

    // Leads by Source (key → count)
    leadSources: Record<string, number>;

    // New Cases Signed
    newCasesWeekly: number;
    newCasesYTD: number;

    // Active Cases (point-in-time)
    activeCases: number;
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function fmt$(n: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function fmtPct(n: number): string {
    return `${n.toFixed(1)}%`;
}

function roiColor(pct: number): string {
    if (pct >= 200) return '#10b981'; // green
    if (pct >= 100) return '#f59e0b'; // amber
    return '#ef4444';                  // red
}

function metricCard(label: string, weekly: string, ytd: string, icon: string): string {
    return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;margin-bottom:12px;">
      <tr>
        <td style="padding:20px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <span style="font-size:18px;">${icon}</span>
                <span style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#6366f1;margin-left:8px;">${label}</span>
              </td>
            </tr>
            <tr>
              <td style="padding-top:14px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="50%" style="padding-right:8px;">
                      <div style="background:#0f0f23;border-radius:8px;padding:14px 16px;">
                        <div style="font-size:10px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#6b7280;margin-bottom:6px;">This Week</div>
                        <div style="font-size:22px;font-weight:700;color:#ffffff;line-height:1;">${weekly}</div>
                      </div>
                    </td>
                    <td width="50%" style="padding-left:8px;">
                      <div style="background:#0f0f23;border-radius:8px;padding:14px 16px;">
                        <div style="font-size:10px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#6b7280;margin-bottom:6px;">YTD</div>
                        <div style="font-size:22px;font-weight:700;color:#a78bfa;line-height:1;">${ytd}</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

function sectionHeader(title: string, subtitle?: string): string {
    return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;margin-top:32px;">
      <tr>
        <td>
          <div style="border-left:3px solid #6366f1;padding-left:12px;">
            <div style="font-size:14px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#e2e8f0;">${title}</div>
            ${subtitle ? `<div style="font-size:11px;color:#6b7280;margin-top:3px;">${subtitle}</div>` : ''}
          </div>
        </td>
      </tr>
    </table>`;
}

function leadSourceBar(source: string, count: number, maxCount: number): string {
    const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
    const barColors: Record<string, string> = {
        'Google LSA': '#6366f1',
        'Social Media': '#ec4899',
        'Website/SEO': '#10b981',
        'Google Business Profile': '#f59e0b',
        'Referral': '#3b82f6',
        'Referrals': '#3b82f6',
    };
    const color = barColors[source] || '#6b7280';
    return `
    <tr>
      <td style="padding:6px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="160" style="font-size:12px;color:#d1d5db;white-space:nowrap;padding-right:12px;">${source}</td>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="background:#1a1a2e;border-radius:4px;height:8px;overflow:hidden;">
                      <div style="background:${color};height:8px;width:${pct}%;border-radius:4px;"></div>
                    </div>
                  </td>
                  <td width="36" style="text-align:right;font-size:12px;font-weight:700;color:#ffffff;padding-left:10px;">${count}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// ─────────────────────────────────────────────
//  Main template
// ─────────────────────────────────────────────
export function generateFirmMetricsEmailHtml(d: WeeklyReportEmailData): string {
    const maxSource = Math.max(...Object.values(d.leadSources), 1);

    const sourceRows = Object.entries(d.leadSources)
        .sort(([, a], [, b]) => b - a)
        .map(([src, cnt]) => leadSourceBar(src, cnt, maxSource))
        .join('');

    const roiClr = roiColor(d.roiPercent);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Weekly Firm Metrics Report</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#09090b;padding:32px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#111118;border-radius:20px;overflow:hidden;border:1px solid #1e1e2e;">

          <!-- ── Header ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e1b4b 100%);padding:36px 40px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#818cf8;margin-bottom:8px;">Firm Performance Report</div>
                    <div style="font-size:26px;font-weight:800;color:#ffffff;line-height:1.2;">${d.firmName}</div>
                    <div style="font-size:13px;color:#a5b4fc;margin-top:6px;">${d.weekRange}</div>
                  </td>
                  <td align="right" valign="top">
                    <div style="background:rgba(255,255,255,0.1);border-radius:12px;padding:10px 16px;text-align:center;display:inline-block;">
                      <div style="font-size:10px;color:#c7d2fe;letter-spacing:0.5px;">WEEKLY</div>
                      <div style="font-size:18px;font-weight:700;color:#ffffff;">RECAP</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Greeting ── -->
          <tr>
            <td style="padding:28px 40px 0;">
              <p style="margin:0;font-size:15px;color:#e2e8f0;line-height:1.7;">
                Hello <strong style="color:#ffffff;">${d.userName}</strong>,
              </p>
              <p style="margin:12px 0 0;font-size:14px;color:#94a3b8;line-height:1.7;">
                Here's your automated weekly performance summary for <strong style="color:#c7d2fe;">${d.weekRange}</strong>.
                Data pulled from Clio, GoHighLevel, and QuickBooks.
              </p>
            </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="padding:20px 40px 0;">

              <!-- ═══ SECTION 1: Revenue ═══ -->
              ${sectionHeader('Revenue', 'QuickBooks · Fees Collected')}
              ${metricCard('Revenue', fmt$(d.revenueWeekly), fmt$(d.revenueYTD), '💰')}

              <!-- ═══ SECTION 2: New Leads ═══ -->
              ${sectionHeader('New Leads', 'GoHighLevel · All Sources')}
              ${metricCard('New Leads', d.leadsWeekly.toString(), d.leadsYTD.toString(), '📥')}

              <!-- ═══ SECTION 3: Conversion Rates ═══ -->
              ${sectionHeader('Conversion Rates', 'GoHighLevel · Pipeline Funnel')}
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;margin-bottom:12px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <!-- Row 1: labels -->
                      <tr>
                        <td width="50%" style="padding-right:8px;">
                          <div style="font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#6366f1;">Consults / Leads</div>
                        </td>
                        <td width="50%" style="padding-left:8px;">
                          <div style="font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#6366f1;">Retainers / Consults</div>
                        </td>
                      </tr>
                      <!-- Row 2: values -->
                      <tr>
                        <td width="50%" style="padding-right:8px;padding-top:10px;">
                          <div style="background:#0f0f23;border-radius:8px;padding:16px;">
                            <div style="font-size:28px;font-weight:800;color:#10b981;line-height:1;">${fmtPct(d.consultsPerLeadRate)}</div>
                            <div style="font-size:11px;color:#6b7280;margin-top:4px;">Lead → Retainer</div>
                          </div>
                        </td>
                        <td width="50%" style="padding-left:8px;padding-top:10px;">
                          <div style="background:#0f0f23;border-radius:8px;padding:16px;">
                            <div style="font-size:28px;font-weight:800;color:#10b981;line-height:1;">${fmtPct(d.retainersPerConsultRate)}</div>
                            <div style="font-size:11px;color:#6b7280;margin-top:4px;">Close Rate</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- ═══ SECTION 4: Marketing ROI ═══ -->
              ${sectionHeader('Marketing ROI', 'QuickBooks · Ad Spend vs Fees Collected (YTD)')}
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;margin-bottom:12px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <!-- ROI % banner -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f0f23;border-radius:10px;margin-bottom:14px;">
                      <tr>
                        <td style="padding:16px 20px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td>
                                <div style="font-size:10px;color:#6b7280;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:4px;">ROI (YTD)</div>
                                <div style="font-size:32px;font-weight:800;color:${roiClr};line-height:1;">${fmtPct(d.roiPercent)}</div>
                              </td>
                              <td align="right" valign="middle">
                                <div style="font-size:11px;color:#6b7280;text-align:right;">
                                  <div>Ad Spend: <strong style="color:#f59e0b;">${fmt$(d.adSpendYTD)}</strong></div>
                                  <div style="margin-top:4px;">Fees Collected: <strong style="color:#10b981;">${fmt$(d.feesCollectedYTD)}</strong></div>
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <!-- CPA -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="50%" style="padding-right:8px;">
                          <div style="background:#0f0f23;border-radius:8px;padding:14px 16px;">
                            <div style="font-size:10px;color:#6b7280;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:6px;">Cost Per Acquisition</div>
                            <div style="font-size:22px;font-weight:700;color:#f59e0b;line-height:1;">${fmt$(d.costPerAcquisition)}</div>
                            <div style="font-size:10px;color:#6b7280;margin-top:4px;">per signed retainer</div>
                          </div>
                        </td>
                        <td width="50%" style="padding-left:8px;">
                          <div style="background:#0f0f23;border-radius:8px;padding:14px 16px;">
                            <div style="font-size:10px;color:#6b7280;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:6px;">Net Return (YTD)</div>
                            <div style="font-size:22px;font-weight:700;color:#10b981;line-height:1;">${fmt$(d.feesCollectedYTD - d.adSpendYTD)}</div>
                            <div style="font-size:10px;color:#6b7280;margin-top:4px;">fees − ad spend</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- ═══ SECTION 5: Leads by Source ═══ -->
              ${sectionHeader('Leads by Source', 'GoHighLevel · All-Time Pipeline')}
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;margin-bottom:12px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${sourceRows || `<tr><td style="font-size:12px;color:#6b7280;padding:8px 0;">No source data available.</td></tr>`}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- ═══ SECTION 6: Cases ═══ -->
              ${sectionHeader('Cases', 'Clio · New Cases Signed + Active')}
              ${metricCard('New Cases Signed', d.newCasesWeekly.toString(), d.newCasesYTD.toString(), '✍️')}

              <!-- Active Cases (point-in-time) -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e;border-radius:12px;margin-bottom:12px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <span style="font-size:18px;">⚖️</span>
                          <span style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#6366f1;margin-left:8px;">Active Cases</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:14px;">
                          <div style="background:#0f0f23;border-radius:8px;padding:20px 24px;text-align:center;">
                            <div style="font-size:48px;font-weight:800;color:#ffffff;line-height:1;">${d.activeCases}</div>
                            <div style="font-size:12px;color:#6b7280;margin-top:6px;">open matters as of today</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ── CTA ── -->
          <tr>
            <td style="padding:28px 40px 0;">
              <a href="https://execview.vercel.app/" target="_blank" style="text-decoration:none;display:block;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:12px;">
                  <tr>
                    <td style="padding:22px 28px;text-align:center;">
                      <div style="font-size:15px;font-weight:700;color:#ffffff;margin-bottom:4px;">View Your Full Dashboard →</div>
                      <div style="font-size:12px;color:#c7d2fe;">Deep-dive analytics, case timelines, and pipeline details</div>
                    </td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>

          <!-- ── Divider ── -->
          <tr>
            <td style="padding:28px 40px 0;">
              <div style="border-top:1px solid #1e1e2e;"></div>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="padding:20px 40px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#374151;line-height:1.8;">
                This report is automatically generated each week from your live integrations.<br/>
                &copy; ${d.yearLabel} ${d.firmName} &mdash; Powered by ExecView Reporting Portal
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
