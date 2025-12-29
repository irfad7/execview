import * as React from 'react';

export const WeeklyReportEmail = ({
    userName,
    firmName,
    dateRange,
    metrics
}: {
    userName: string,
    firmName: string,
    dateRange: string,
    metrics: {
        revenue: number,
        leads: number,
        conversion: number
    }
}) => (
    <div style={{
        fontFamily: 'Inter, sans-serif',
        backgroundColor: '#09090b',
        color: '#ffffff',
        padding: '40px',
        borderRadius: '24px',
        maxWidth: '600px',
        margin: '0 auto'
    }}>
        <h1 style={{ color: '#6366f1', fontSize: '24px', fontWeight: 'bold' }}>Weekly Performance Report</h1>
        <p style={{ color: '#a1a1aa', fontSize: '14px' }}>{firmName} | {dateRange}</p>

        <div style={{ margin: '30px 0', borderTop: '1px solid #27272a', paddingTop: '30px' }}>
            <p style={{ fontSize: '16px' }}>Hello {userName},</p>
            <p style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: '1.6' }}>
                Your automated weekly report is ready. We've compiled the latest insights from Clio, GoHighLevel, and QuickBooks to give you a clear view of your firm's performance.
            </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div style={{ backgroundColor: '#18181b', padding: '20px', borderRadius: '16px' }}>
                <p style={{ fontSize: '10px', color: '#a1a1aa', textTransform: 'uppercase', marginBottom: '8px' }}>Revenue</p>
                <p style={{ fontSize: '18px', fontWeight: 'bold' }}>${metrics.revenue.toLocaleString()}</p>
            </div>
            <div style={{ backgroundColor: '#18181b', padding: '20px', borderRadius: '16px' }}>
                <p style={{ fontSize: '10px', color: '#a1a1aa', textTransform: 'uppercase', marginBottom: '8px' }}>Leads</p>
                <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{metrics.leads}</p>
            </div>
            <div style={{ backgroundColor: '#18181b', padding: '20px', borderRadius: '16px' }}>
                <p style={{ fontSize: '10px', color: '#a1a1aa', textTransform: 'uppercase', marginBottom: '8px' }}>Conversion</p>
                <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{metrics.conversion}%</p>
            </div>
        </div>

        <div style={{ backgroundColor: '#6366f1', padding: '20px', borderRadius: '16px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>View Full Analytics Deck</p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.8 }}>Login to your dashboard for deep-dive metrics</p>
        </div>

        <p style={{ fontSize: '12px', color: '#52525b', marginTop: '40px', textAlign: 'center' }}>
            &copy; 2025 Reporting Portal for {firmName}. All rights reserved.
        </p>
    </div>
);
