export const inr = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');

export const billStatus = (b) => (b.status === 'paid' ? 'paid' : b.isOverdue ? 'overdue' : 'pending');

export const monthLabel = (period) => {
  if (!period) return '';
  const [y, m] = period.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
};
