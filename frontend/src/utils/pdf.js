import { jsPDF } from 'jspdf';

// jsPDF's built-in fonts have no rupee glyph, so the PDF uses "Rs."
const rs = (n) => 'Rs. ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const d = (x) => (x ? new Date(x).toLocaleDateString('en-GB') : '-');

export function downloadBillPdf(bill) {
  const doc = new jsPDF();
  const status = bill.status === 'paid' ? 'PAID' : bill.isOverdue ? 'OVERDUE' : 'PENDING';

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('GridLedger', 14, 15);
  doc.setFontSize(10);
  doc.text('Electricity Bill (simulated billing system)', 14, 23);
  doc.setFontSize(12);
  doc.text(status, 196, 20, { align: 'right' });

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  let y = 46;
  const row = (label, value) => {
    doc.setFont(undefined, 'bold');
    doc.text(label, 14, y);
    doc.setFont(undefined, 'normal');
    doc.text(String(value), 80, y);
    y += 8;
  };

  row('Bill No', bill.billNo);
  row('Billing period', bill.period);
  row('Consumer', `${bill.consumer?.name || ''} (${bill.consumerId})`);
  row('Address', bill.consumer?.address || '-');
  row('Meter ID', bill.meterId);
  row('Due date', d(bill.dueDate));
  if (bill.status === 'paid') row('Paid on', `${d(bill.paidDate)} via ${bill.paymentMethod}`);

  y += 6;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, y - 4, 196, y - 4);
  row('Previous reading', bill.previousReading);
  row('Current reading', bill.currentReading);
  row('Units consumed', bill.units);
  row('Rate per unit', rs(bill.ratePerUnit));

  y += 4;
  doc.line(14, y - 4, 196, y - 4);
  row('Energy charge', rs(bill.energyCharge));
  row('Fixed charge', rs(bill.fixedCharge));
  row('Tax', rs(bill.taxAmount));
  doc.setFontSize(14);
  row('TOTAL AMOUNT', rs(bill.amount));

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('This is a simulated bill generated for demonstration purposes only.', 14, 280);
  doc.save(`${bill.billNo}.pdf`);
}
