import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { errMsg } from '../services/api';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { billStatus, fmtDate, inr, monthLabel } from '../utils/format';
import { downloadBillPdf } from '../utils/pdf';

export default function ConsumerDashboard() {
  const [data, setData] = useState(null);
  const [bills, setBills] = useState([]);
  const [error, setError] = useState('');

  // pay popup state
  const [payingBill, setPayingBill] = useState(null);
  const [method, setMethod] = useState('upi');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  const load = () =>
    Promise.all([api.get('/dashboard/me'), api.get('/bills')])
      .then(([d, b]) => {
        setData(d.data);
        setBills(b.data);
      })
      .catch((e) => setError(errMsg(e)));

  useEffect(() => {
    load();
  }, []);

  const openPay = (bill) => {
    setPayError('');
    setMethod('upi');
    setPayingBill(bill);
  };

  const confirmPay = async () => {
    setPaying(true);
    setPayError('');
    try {
      await api.patch(`/bills/${payingBill._id}/pay`, { paymentMethod: method });
      setPayingBill(null);
      await load();
    } catch (e) {
      setPayError(errMsg(e));
    } finally {
      setPaying(false);
    }
  };

  if (error) return <p className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>;
  if (!data) return <p className="text-slate-500">Loading your account…</p>;

  const { consumer, meters, latestBill } = data;
  const chart = data.monthlyConsumption.map((m) => ({ ...m, label: monthLabel(m.period) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {consumer.name}</h1>
        <p className="text-sm text-slate-500">
          Consumer ID {consumer.consumerId} · {consumer.address} · Meter{meters.length > 1 ? 's' : ''}: {meters.map((m) => m.meterId).join(', ') || 'none assigned'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Latest bill" value={latestBill ? inr(latestBill.amount) : '—'} hint={latestBill ? `${latestBill.period} · ${latestBill.units} units` : 'No bills yet'} />
        <StatCard label="Amount due" value={inr(data.totalPending)} tone={data.totalPending ? 'amber' : 'green'} hint={`${data.pendingCount} pending bill(s)`} />
        <StatCard label="Total paid" value={inr(data.totalPaid)} tone="green" />
        <StatCard label="Bills" value={bills.length} />
      </div>

      <div className="card p-5">
        <h2 className="mb-4 font-semibold">Your monthly consumption (units)</h2>
        {chart.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No readings recorded for your meter yet.</p>
        ) : (
          <div className="h-64">
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

      <div className="card overflow-x-auto">
        <div className="border-b px-5 py-3 font-semibold">Billing history</div>
        <table className="w-full">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="th">Bill no</th>
              <th className="th">Period</th>
              <th className="th">Units</th>
              <th className="th">Amount</th>
              <th className="th">Due date</th>
              <th className="th">Status</th>
              <th className="th">Paid on</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bills.map((b) => (
              <tr key={b._id} className="hover:bg-slate-50">
                <td className="td font-semibold">{b.billNo}</td>
                <td className="td">{b.period}</td>
                <td className="td">{b.units}</td>
                <td className="td font-semibold">{inr(b.payable ?? b.amount)} {b.lateFeeDue > 0 && <div className="text-xs font-normal text-red-600">incl. late fee {inr(b.lateFeeDue)}</div>}</td>
                <td className="td">{fmtDate(b.dueDate)}</td>
                <td className="td">
                  <Badge type={billStatus(b)} />
                </td>
                <td className="td">{b.status === 'paid' ? `${fmtDate(b.paidDate)} (${b.paymentMethod})` : '—'}</td>
                <td className="td text-right">
                  {b.status === 'pending' && (
                    <button
                      className="mr-3 rounded bg-green-600 px-3 py-1 text-sm font-semibold text-white hover:bg-green-700"
                      onClick={() => openPay(b)}
                    >
                      Pay Now
                    </button>
                  )}
                  <button className="text-sm font-semibold text-slate-700 hover:underline" onClick={() => downloadBillPdf(b)}>
                    Download PDF
                  </button>
                </td>
              </tr>
            ))}
            {bills.length === 0 && (
              <tr>
                <td colSpan="8" className="td py-10 text-center text-slate-400">
                  No bills have been generated for your account yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {payingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-96 rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-semibold">Pay bill {payingBill.billNo}</h3>
            <p className="mb-1 text-sm text-slate-500">Period {payingBill.period} · {payingBill.units} units</p>
            <p className="mb-1 text-2xl font-bold">{inr(payingBill.payable ?? payingBill.amount)}</p>
{payingBill.lateFeeDue > 0 && <p className="mb-4 text-xs text-red-600">Includes late fee of {inr(payingBill.lateFeeDue)} (overdue)</p>}

            <label className="mb-1 block text-sm font-medium">Payment method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="mb-4 w-full rounded border p-2">
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="netbanking">Net Banking</option>
            </select>

            {payError && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{payError}</p>}
            <p className="mb-4 text-xs text-slate-400">Demo only: this is a simulated payment, no real money is charged.</p>

            <div className="flex justify-end gap-2">
              <button onClick={() => setPayingBill(null)} className="rounded border px-3 py-1">
                Cancel
              </button>
              <button
                onClick={confirmPay}
                disabled={paying}
                className="rounded bg-green-600 px-3 py-1 font-semibold text-white disabled:opacity-50"
              >
                {paying ? 'Processing…' : 'Confirm payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}