import { useCallback, useEffect, useState } from 'react';
import api, { errMsg } from '../services/api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { billStatus, fmtDate, inr } from '../utils/format';
import { downloadBillPdf } from '../utils/pdf';

export default function Bills() {
  const [bills, setBills] = useState([]);
  const [tariff, setTariff] = useState(null);
  const [tariffMsg, setTariffMsg] = useState(null);
  const [filters, setFilters] = useState({ status: '', period: '', search: '' });
  const [genPeriod, setGenPeriod] = useState('');
  const [notice, setNotice] = useState(null);
  const [payBill, setPayBill] = useState(null);
  const [method, setMethod] = useState('upi');

  const load = useCallback(() => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => v && (params[k] = v));
    api.get('/bills', { params }).then((r) => setBills(r.data)).catch((e) => setNotice({ ok: false, text: errMsg(e) }));
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    api.get('/tariff').then((r) => setTariff(r.data));
  }, []);

  const setT = (k) => (e) => setTariff({ ...tariff, [k]: e.target.value });

  const saveTariff = async (e) => {
    e.preventDefault();
    setTariffMsg(null);
    try {
      const r = await api.put('/tariff', tariff);
      setTariff(r.data);
      setTariffMsg({ ok: true, text: 'Tariff saved. It applies to bills generated from now on.' });
    } catch (err) {
      setTariffMsg({ ok: false, text: errMsg(err) });
    }
  };

  const generate = async () => {
    setNotice(null);
    try {
      const r = await api.post('/bills/generate', genPeriod ? { period: genPeriod } : {});
      setNotice({ ok: true, text: r.data.message });
      load();
    } catch (err) {
      setNotice({ ok: false, text: errMsg(err) });
    }
  };

  const markPaid = async () => {
    try {
      await api.patch(`/bills/${payBill._id}/payment`, { status: 'paid', paymentMethod: method });
      setPayBill(null);
      setNotice({ ok: true, text: `Bill ${payBill.billNo} marked as paid.` });
      load();
    } catch (err) {
      setNotice({ ok: false, text: errMsg(err) });
    }
  };

  const markPending = async (b) => {
    try {
      await api.patch(`/bills/${b._id}/payment`, { status: 'pending' });
      load();
    } catch (err) {
      setNotice({ ok: false, text: errMsg(err) });
    }
  };

  const setF = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Billing</h1>

      {/* tariff configuration */}
      {tariff && (
        <form onSubmit={saveTariff} className="card p-5">
          <h2 className="mb-3 font-semibold">Tariff configuration</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <div>
              <label className="label">Rate / unit (₹)</label>
              <input className="input" type="number" min="0" step="any" value={tariff.ratePerUnit} onChange={setT('ratePerUnit')} />
            </div>
            <div>
              <label className="label">Fixed charge (₹)</label>
              <input className="input" type="number" min="0" step="any" value={tariff.fixedCharge} onChange={setT('fixedCharge')} />
            </div>
            <div>
              <label className="label">Tax (%)</label>
              <input className="input" type="number" min="0" max="100" step="any" value={tariff.taxPercent} onChange={setT('taxPercent')} />
            </div>
            <div>
              <label className="label">Due after (days)</label>
              <input className="input" type="number" min="1" value={tariff.dueDays} onChange={setT('dueDays')} />
            </div>
            <div>
              <label className="label">Late fee (%)</label>
              <input className="input" type="number" min="0" max="100" step="any" value={tariff.lateFeePercent ?? 2} onChange={setT('lateFeePercent')} />
            </div>
            <div className="flex items-end">
              <button className="btn-primary w-full">Save tariff</button>
            </div>
          </div>
          {tariffMsg && <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${tariffMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{tariffMsg.text}</p>}
        </form>
      )}

      {/* generate */}
      <div className="card flex flex-wrap items-end gap-3 p-5">
        <div>
          <label className="label">Billing period (optional)</label>
          <input className="input" type="month" value={genPeriod} onChange={(e) => setGenPeriod(e.target.value)} />
        </div>
        <button className="btn-accent" onClick={generate}>
          Generate bills from un-billed readings
        </button>
        <p className="text-xs text-slate-500">Leave the period empty to bill every reading that does not have a bill yet.</p>
      </div>

      {notice && (
        <p className={`rounded-lg px-3 py-2 text-sm ${notice.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`} onClick={() => setNotice(null)}>
          {notice.text}
        </p>
      )}

      {/* filters */}
      <div className="flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Search consumer, meter, bill no…" value={filters.search} onChange={setF('search')} />
        <select className="input max-w-[10rem]" value={filters.status} onChange={setF('status')}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
        </select>
        <input className="input max-w-[11rem]" type="month" value={filters.period} onChange={setF('period')} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="th">Bill no</th>
              <th className="th">Consumer</th>
              <th className="th">Period</th>
              <th className="th">Units</th>
              <th className="th">Amount</th>
              <th className="th">Due</th>
              <th className="th">Status</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bills.map((b) => (
              <tr key={b._id} className="hover:bg-slate-50">
                <td className="td font-semibold">{b.billNo}</td>
                <td className="td">
                  {b.consumerId} <span className="text-slate-400">· {b.consumer?.name}</span>
                </td>
                <td className="td">{b.period}</td>
                <td className="td">{b.units}</td>
                <td className="td font-semibold">
                  {inr(b.payable ?? b.amount)}
                  {b.lateFeeDue > 0 && <div className="text-xs font-normal text-red-600">incl. late fee {inr(b.lateFeeDue)}</div>}
                </td>
                <td className="td">{fmtDate(b.dueDate)}</td>
                <td className="td">
                  <Badge type={billStatus(b)} />
                  {b.status === 'paid' && <span className="ml-2 text-xs text-slate-400">{b.paymentMethod?.toUpperCase()}</span>}
                </td>
                <td className="td space-x-3 whitespace-nowrap text-right">
                  {b.status === 'pending' ? (
                    <button className="text-sm font-semibold text-emerald-600 hover:underline" onClick={() => setPayBill(b)}>
                      Mark paid
                    </button>
                  ) : (
                    <button className="text-sm font-semibold text-amber-600 hover:underline" onClick={() => markPending(b)}>
                      Undo
                    </button>
                  )}
                  <button className="text-sm font-semibold text-slate-700 hover:underline" onClick={() => downloadBillPdf(b)}>
                    PDF
                  </button>
                </td>
              </tr>
            ))}
            {bills.length === 0 && (
              <tr>
                <td colSpan="8" className="td py-10 text-center text-slate-400">
                  No bills found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!payBill} title="Record payment" onClose={() => setPayBill(null)}>
        {payBill && (
          <div className="space-y-4">
            <p className="text-sm">
              Bill <b>{payBill.billNo}</b> for <b>{inr(payBill.payable ?? payBill.amount)}</b>
              {payBill.lateFeeDue > 0 && <span className="text-red-600"> (includes late fee {inr(payBill.lateFeeDue)})</span>}
            </p>
            <div>
              <label className="label">Payment method</label>
              <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="netbanking">Net banking</option>
              </select>
            </div>
            <p className="text-xs text-slate-500">Simulated payment tracking – no real payment is processed. The payment date is stored as today.</p>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setPayBill(null)}>
                Cancel
              </button>
              <button className="btn-accent" onClick={markPaid}>
                Confirm payment
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}