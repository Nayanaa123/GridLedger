import { useCallback, useEffect, useState } from 'react';
import api, { errMsg } from '../services/api';
import { fmtDate } from '../utils/format';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  ['billing', 'Billing'],
  ['meter', 'Meter'],
  ['power_cut', 'Power cut'],
  ['other', 'Other'],
];
const STATUS_LABEL = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' };
const STATUS_CLS = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
};
const catLabel = (c) => CATEGORIES.find(([v]) => v === c)?.[1] || c;

function StatusPill({ status }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLS[status]}`}>{STATUS_LABEL[status]}</span>;
}

export default function Complaints() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('');
  const [msg, setMsg] = useState(null);

  // consumer form
  const [form, setForm] = useState({ category: 'billing', subject: '', description: '' });

  // admin edit state: { [id]: { reply, status } }
  const [edits, setEdits] = useState({});

  const load = useCallback(() => {
    const params = filter ? { status: filter } : {};
    api
      .get('/complaints', { params })
      .then((r) => setList(r.data))
      .catch((e) => setMsg({ ok: false, text: errMsg(e) }));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const setF = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const r = await api.post('/complaints', form);
      setMsg({ ok: true, text: `Complaint ${r.data.complaintNo} submitted.` });
      setForm({ category: 'billing', subject: '', description: '' });
      load();
    } catch (err) {
      setMsg({ ok: false, text: errMsg(err) });
    }
  };

  const getEdit = (c) => edits[c._id] || { reply: c.adminReply || '', status: c.status };
  const setEdit = (c, patch) => setEdits({ ...edits, [c._id]: { ...getEdit(c), ...patch } });

  const saveEdit = async (c) => {
    const ed = getEdit(c);
    try {
      await api.patch(`/complaints/${c._id}`, { status: ed.status, adminReply: ed.reply });
      setMsg({ ok: true, text: `Complaint ${c.complaintNo} updated.` });
      load();
    } catch (err) {
      setMsg({ ok: false, text: errMsg(err) });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{isAdmin ? 'Complaints' : 'My Complaints'}</h1>

      {msg && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
          onClick={() => setMsg(null)}
        >
          {msg.text}
        </p>
      )}

      {/* consumer: raise a complaint */}
      {!isAdmin && (
        <form onSubmit={submit} className="card space-y-3 p-5">
          <h2 className="font-semibold">Raise a complaint</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={setF('category')}>
                {CATEGORIES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Subject</label>
              <input className="input" required maxLength="120" value={form.subject} onChange={setF('subject')} />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows="3" required maxLength="1000" value={form.description} onChange={setF('description')} />
          </div>
          <button className="btn-primary">Submit complaint</button>
        </form>
      )}

      {/* admin: filter */}
      {isAdmin && (
        <div className="flex gap-3">
          <select className="input max-w-[11rem]" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      )}

      {/* list */}
      <div className="space-y-4">
        {list.map((c) => {
          const ed = getEdit(c);
          return (
            <div key={c._id} className="card space-y-2 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold">
                  {c.complaintNo} · {c.subject}
                </div>
                <StatusPill status={c.status} />
              </div>
              <p className="text-xs text-slate-500">
                {catLabel(c.category)} · {fmtDate(c.createdAt)}
                {isAdmin && ` · ${c.consumerId}${c.consumer?.name ? ' · ' + c.consumer.name : ''}`}
              </p>
              <p className="text-sm">{c.description}</p>

              {/* consumer sees reply */}
              {!isAdmin && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm">
                  <span className="font-semibold">Admin reply: </span>
                  {c.adminReply || <span className="text-slate-400">No reply yet.</span>}
                </div>
              )}

              {/* admin reply form */}
              {isAdmin && (
                <div className="space-y-2 rounded-lg bg-slate-50 p-3">
                  <textarea
                    className="input"
                    rows="2"
                    placeholder="Write a reply…"
                    maxLength="1000"
                    value={ed.reply}
                    onChange={(e) => setEdit(c, { reply: e.target.value })}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <select className="input max-w-[11rem]" value={ed.status} onChange={(e) => setEdit(c, { status: e.target.value })}>
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <button className="btn-primary" onClick={() => saveEdit(c)}>
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {list.length === 0 && <p className="card p-10 text-center text-slate-400">No complaints found.</p>}
      </div>
    </div>
  );
}