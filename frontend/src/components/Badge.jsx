const styles = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-200 text-slate-600',
  faulty: 'bg-red-100 text-red-700',
  csv: 'bg-sky-100 text-sky-700',
  manual: 'bg-slate-100 text-slate-600',
  yes: 'bg-emerald-100 text-emerald-700',
  no: 'bg-slate-100 text-slate-500',
};

export default function Badge({ type, children }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[type] || styles.manual}`}>
      {children ?? type}
    </span>
  );
}
