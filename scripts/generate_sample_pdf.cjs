const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
    size: 'A4',
    margin: 50
});

const outputPath = path.join(__dirname, '..', 'public', 'sample-report.pdf');
const stream = fs.createWriteStream(outputPath);

doc.pipe(stream);

// Background Color (simulated dark mode)
doc.rect(0, 0, 595.28, 841.89).fill('#09090b');

// Header
doc.fillColor('#6366f1').fontSize(24).text('WEEKLY PERFORMANCE REPORT', 50, 50, { characterSpacing: 2 });
doc.fillColor('#71717a').fontSize(10).text('DOE LAW FIRM | DECEMBER 2025', 50, 80);

// Divider
doc.moveTo(50, 110).lineTo(545, 110).strokeColor('#27272a').lineWidth(1).stroke();

// Summary Section
doc.fillColor('#ffffff').fontSize(16).text('Executive Summary', 50, 140);
doc.fillColor('#a1a1aa').fontSize(11).text('This report summarizes the key performance indicators across Clio, GoHighLevel, and QuickBooks for the previous seven days. The firm continues to show strong growth in new leads and revenue collection.', 50, 165, { width: 495, lineGap: 5 });

// Metrics Grid (Boxes)
const drawMetric = (label, value, x, y, color = '#6366f1') => {
    doc.fillColor('#18181b').rect(x, y, 150, 80).fill();
    doc.fillColor('#71717a').fontSize(8).text(label.toUpperCase(), x + 15, y + 20, { characterSpacing: 1 });
    doc.fillColor('#ffffff').fontSize(20).text(value, x + 15, y + 40, { font: 'Helvetica-Bold' });
    doc.rect(x, y, 2, 80).fill(color);
};

drawMetric('Revenue YTD', '$492,400', 50, 230);
drawMetric('Weekly Leads', '142', 215, 230, '#10b981');
drawMetric('Avg Case Value', '$4,200', 380, 230, '#f59e0b');

// Leads Chart Placeholder
doc.fillColor('#ffffff').fontSize(14).text('Lead Source Distribution', 50, 350);
doc.rect(50, 380, 495, 200).fill('#18181b');

// Labels for "Chart"
const drawBar = (label, percentage, y) => {
    doc.fillColor('#ffffff').fontSize(10).text(label, 70, y);
    doc.rect(150, y - 2, 350, 10).fill('#27272a');
    doc.rect(150, y - 2, 350 * (percentage / 100), 10).fill('#6366f1');
    doc.fillColor('#71717a').text(`${percentage}%`, 510, y);
};

drawBar('Google LSA', 45, 410);
drawBar('Facebook Ads', 25, 440);
drawBar('Referrals', 20, 470);
drawBar('Direct Web', 10, 500);

// Case Status Section
doc.fillColor('#ffffff').fontSize(14).text('Operational Health', 50, 620);
doc.fillColor('#a1a1aa').fontSize(10).text('94% of cases have discovery status updated.', 50, 645);
doc.fillColor('#a1a1aa').fontSize(10).text('Average phone time for qualified leads: 18.5 minutes.', 50, 660);

// Footer
doc.fillColor('#3f3f46').fontSize(8).text('© 2025 Reporting Portal. All sensitive data is encrypted and stored locally.', 50, 780, { align: 'center', width: 495 });

doc.end();

stream.on('finish', () => {
    console.log('Sample PDF generated successfully at public/sample-report.pdf');
});
