import { useCallback, useEffect, useState } from 'react';
import api, { errMsg } from '../services/api';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { fmtDate } from '../utils/format';

const today = () => new Date().toISOString().slice(0, 10);

export default function Meters() {
  const [meters, setMeters] = useState([]);
  const [consumers, setConsumers] = useState([]);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [history, setHistory] = useState(null); // { meterId, rows }

  const load = useCallback(() => {
    api.get('/meters').then((r) => setMeters(r.data)).catch((e) => setNotice(errMsg(e)));
  }, []);

  useEffect(() => {
    load();
    api.get('/consumers').then((r) => setConsumers(r.data)).catch(() => {});
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ meterId: '', consumerId: consumers[0]?.consumerId || '', installationDate: today(), status: 'active' });
    setError('');
  };
  const openEdit = (m) => {
    setEditing(m);
    setForm({ meterId: m.meterId, consumerId: m.consumer?.consumerId || '', installationDate: (m.installationDate || '').slice(0, 10), status: m.status });
    setError('');
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) await api.put(`/meters/${editing._id}`, form);
      else await api.post('/meters', form);
      setForm(null);
      setNotice(editing ? 'Meter updated.' : 'Meter registered.');
      load();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const showHistory = async (m) => {
    try {
      const r = await api.get(`/meters/${m.meterId}/history`);
      setHistory({ meterId: m.meterId, rows: r.data });
    } catch (err) {
      setNotice(errMsg(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Meters</h1>
        <button className="btn-accent" onClick={openAdd}>
          + Register meter
        </button>
      </div>
      {notice && (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700" onClick={() => setNotice('')}>
          {notice}
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="th">Meter ID</th>
              <th className="th">Assigned consumer</th>
              <th className="th">Installed</th>
              <th className="th">Status</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {meters.map((m) => (
              <tr key={m._id} className="hover:bg-slate-50">
                <td className="td font-semibold">{m.meterId}</td>
                <td className="td">{m.consumer ? `${m.consumer.consumerId} – ${m.consumer.name}` : '—'}</td>
                <td className="td">{fmtDate(m.installationDate)}</td>
                <td className="td">
                  <Badge type={m.status} />
                </td>
                <td className="td space-x-3 text-right">
                  <button className="text-sm font-semibold text-slate-700 hover:underline" onClick={() => showHistory(m)}>
                    History
                  </button>
                  <button className="text-sm font-semibold text-slate-700 hover:underline" onClick={() => openEdit(m)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {meters.length === 0 && (
              <tr>
                <td colSpan="5" className="td py-10 text-center text-slate-400">
                  No meters registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!form} title={editing ? `Edit ${editing.meterId}` : 'Register meter'} onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={save} className="space-y-3">
            <div>
              <label className="label">Meter ID</label>
              <input className="input" required disabled={!!editing} placeholder="M006" value={form.meterId} onChange={set('meterId')} />
            </div>
            <div>
              <label className="label">Assign to consumer</label>
              <select className="input" required value={form.consumerId} onChange={set('consumerId')}>
                {consumers.map((c) => (
                  <option key={c._id} value={c.consumerId}>
                    {c.consumerId} – {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Installation date</label>
                <input className="input" type="date" value={form.installationDate} onChange={set('installationDate')} />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={set('status')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="faulty">Faulty</option>
                </select>
              </div>
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-ghost" onClick={() => setForm(null)}>
                Cancel
              </button>
              <button className="btn-primary">{editing ? 'Save changes' : 'Register meter'}</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!history} title={`Reading history – ${history?.meterId}`} onClose={() => setHistory(null)} wide>
        {history && (
          <table className="w-full">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="th">Period</th>
                <th className="th">Date</th>
                <th className="th">Previous</th>
                <th className="th">Current</th>
                <th className="th">Units</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.rows.map((r) => (
                <tr key={r._id}>
                  <td className="td">{r.period}</td>
                  <td className="td">{fmtDate(r.readingDate)}</td>
                  <td className="td">{r.previousReading}</td>
                  <td className="td">{r.currentReading}</td>
                  <td className="td font-semibold">{r.units}</td>
                </tr>
              ))}
              {history.rows.length === 0 && (
                <tr>
                  <td colSpan="5" className="td py-8 text-center text-slate-400">
                    No readings recorded for this meter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}
