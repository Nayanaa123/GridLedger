import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { downloadFile, errMsg } from '../services/api';
import { fmtDate, inr, monthLabel } from '../utils/format';

function Section({ title, onExport, children }) {
  return (
    <div className="card overflow-x-auto">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h2 className="font-semibold">{title}</h2>
        <button className="btn-ghost !py-1.5" onClick={onExport}>
          Export CSV
        </button>
      </div>
      {children}
    </div>
  );
}

export default function Reports() {
  const [consumption, setConsumption] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [pending, setPending] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/reports/consumption'), api.get('/reports/revenue'), api.get('/reports/pending')])
      .then(([c, r, p]) => {
        setConsumption(c.data);
        setRevenue(r.data);
        setPending(p.data);
      })
      .catch((e) => setError(errMsg(e)));
  }, []);

  const exportCsv = (path, name) => () => downloadFile(path, `${name}.csv`, { format: 'csv' }).catch((e) => setError(errMsg(e)));

  if (error) return <p className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>;
  if (!consumption) return <p className="text-slate-500">Loading reports…</p>;

  const revChart = revenue.map((r) => ({ ...r, label: monthLabel(r.period) }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports &amp; Analytics</h1>

      <Section title="Revenue summary (billed vs collected)" onExport={exportCsv('/reports/revenue', 'revenue-report')}>
        {revChart.length > 0 && (
          <div className="h-64 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(v) => inr(v)} />
                <Legend />
                <Bar dataKey="billed" name="Billed" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <table className="w-full">
          <thead className="border-y bg-slate-50">
            <tr>
              <th className="th">Period</th>
              <th className="th">Bills</th>
              <th className="th">Billed</th>
              <th className="th">Collected</th>
              <th className="th">Outstanding</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {revenue.map((r) => (
              <tr key={r.period}>
                <td className="td">{r.period}</td>
                <td className="td">{r.bills}</td>
                <td className="td">{inr(r.billed)}</td>
                <td className="td text-emerald-600">{inr(r.collected)}</td>
                <td className="td text-amber-600">{inr(r.outstanding)}</td>
              </tr>
            ))}
            {revenue.length === 0 && (
              <tr>
                <td colSpan="5" className="td py-8 text-center text-slate-400">
                  No bills yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      <Section title="Consumer-wise consumption" onExport={exportCsv('/reports/consumption', 'consumption-report')}>
        <table className="w-full">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="th">Consumer</th>
              <th className="th">Name</th>
              <th className="th">Readings</th>
              <th className="th">Total units</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {consumption.consumerWise.map((c) => (
              <tr key={c.consumerId}>
                <td className="td font-semibold">{c.consumerId}</td>
                <td className="td">{c.name}</td>
                <td className="td">{c.readings}</td>
                <td className="td">{c.units}</td>
              </tr>
            ))}
            {consumption.consumerWise.length === 0 && (
              <tr>
                <td colSpan="4" className="td py-8 text-center text-slate-400">
                  No readings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      <Section title="Pending bills" onExport={exportCsv('/reports/pending', 'pending-bills-report')}>
        <table className="w-full">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="th">Bill no</th>
              <th className="th">Consumer</th>
              <th className="th">Period</th>
              <th className="th">Amount</th>
              <th className="th">Due</th>
              <th className="th">Overdue</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pending.map((p) => (
              <tr key={p.billNo}>
                <td className="td font-semibold">{p.billNo}</td>
                <td className="td">
                  {p.consumerId} · {p.name}
                </td>
                <td className="td">{p.period}</td>
                <td className="td">{inr(p.amount)}</td>
                <td className="td">{fmtDate(p.dueDate)}</td>
                <td className={`td ${p.overdue === 'Yes' ? 'font-semibold text-red-600' : ''}`}>{p.overdue}</td>
              </tr>
            ))}
            {pending.length === 0 && (
              <tr>
                <td colSpan="6" className="td py-8 text-center text-slate-400">
                  No pending bills.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
