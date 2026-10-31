import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { errMsg } from '../services/api';
import StatCard from '../components/StatCard';
import { inr, monthLabel } from '../utils/format';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard/stats').then((r) => setStats(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <p className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>;
  if (!stats) return <p className="text-slate-500">Loading dashboard…</p>;

  const chart = stats.monthlyConsumption.map((m) => ({ ...m, label: monthLabel(m.period) }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total consumers" value={stats.totalConsumers} />
        <StatCard label="Registered meters" value={stats.totalMeters} />
        <StatCard label="Bills generated" value={stats.totalBills} hint={`${stats.paidBills} paid · ${stats.pendingBills} pending`} />
        <StatCard label="Revenue collected" value={inr(stats.totalRevenue)} tone="green" />
        <StatCard label="Pending payments" value={inr(stats.pendingAmount)} tone="amber" hint={`${stats.pendingBills} bills`} />
        <StatCard label="Overdue bills" value={stats.overdueBills} tone={stats.overdueBills ? 'red' : 'slate'} />
      </div>

      <div className="card p-5">
        <h2 className="mb-4 font-semibold">Monthly consumption (units)</h2>
        {chart.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No readings yet. Upload a CSV on the Readings page to see the chart.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(v) => [`${v} units`, 'Consumption']} />
                <Bar dataKey="units" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
