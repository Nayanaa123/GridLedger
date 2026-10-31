import { useCallback, useEffect, useState } from 'react';
import api, { errMsg } from '../services/api';
import Modal from '../components/Modal';

const EMPTY = { consumerId: '', name: '', address: '', phone: '', email: '', password: '' };

export default function Consumers() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null); // null = closed
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    api.get('/consumers', { params: { search } }).then((r) => setRows(r.data)).catch((e) => setNotice(errMsg(e)));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce search typing
    return () => clearTimeout(t);
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setError('');
  };
  const openEdit = (c) => {
    setEditing(c);
    setForm({ consumerId: c.consumerId, name: c.name, address: c.address, phone: c.phone || '', email: c.user?.email || '', password: '' });
    setError('');
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) await api.put(`/consumers/${editing._id}`, form);
      else await api.post('/consumers', form);
      setForm(null);
      setNotice(editing ? 'Consumer updated.' : 'Consumer added.');
      load();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete consumer ${c.consumerId} (${c.name}) and their meters?`)) return;
    try {
      await api.delete(`/consumers/${c._id}`);
      setNotice('Consumer deleted.');
      load();
    } catch (err) {
      setNotice(errMsg(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Consumers</h1>
        <button className="btn-accent" onClick={openAdd}>
          + Add consumer
        </button>
      </div>

      <input className="input max-w-sm" placeholder="Search by name, ID, address or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
      {notice && (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700" onClick={() => setNotice('')}>
          {notice}
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="th">ID</th>
              <th className="th">Name</th>
              <th className="th">Email (login)</th>
              <th className="th">Address</th>
              <th className="th">Phone</th>
              <th className="th">Meters</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((c) => (
              <tr key={c._id} className="hover:bg-slate-50">
                <td className="td font-semibold">{c.consumerId}</td>
                <td className="td">{c.name}</td>
                <td className="td text-slate-500">{c.user?.email}</td>
                <td className="td text-slate-500">{c.address}</td>
                <td className="td">{c.phone || '—'}</td>
                <td className="td">{c.meters.join(', ') || <span className="text-slate-400">none</span>}</td>
                <td className="td space-x-2 text-right">
                  <button className="text-sm font-semibold text-slate-700 hover:underline" onClick={() => openEdit(c)}>
                    Edit
                  </button>
                  <button className="text-sm font-semibold text-red-600 hover:underline" onClick={() => remove(c)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan="7" className="td py-10 text-center text-slate-400">
                  No consumers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!form} title={editing ? `Edit ${editing.consumerId}` : 'Add consumer'} onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Consumer ID</label>
                <input className="input" required disabled={!!editing} placeholder="C006" value={form.consumerId} onChange={set('consumerId')} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={set('phone')} />
              </div>
            </div>
            <div>
              <label className="label">Full name</label>
              <input className="input" required value={form.name} onChange={set('name')} />
            </div>
            <div>
              <label className="label">Address</label>
              <input className="input" required value={form.address} onChange={set('address')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Login email</label>
                <input className="input" type="email" required value={form.email} onChange={set('email')} />
              </div>
              <div>
                <label className="label">{editing ? 'New password (optional)' : 'Password'}</label>
                <input className="input" type="text" placeholder={editing ? 'leave blank to keep' : 'default: consumer123'} value={form.password} onChange={set('password')} />
              </div>
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-ghost" onClick={() => setForm(null)}>
                Cancel
              </button>
              <button className="btn-primary">{editing ? 'Save changes' : 'Add consumer'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
