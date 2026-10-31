import { useCallback, useEffect, useRef, useState } from 'react';
import api, { errMsg } from '../services/api';
import Badge from '../components/Badge';
import { fmtDate } from '../utils/format';
import { useAuth } from '../context/AuthContext';

const TEMPLATE =
  'consumerId,meterId,previousReading,currentReading,readingDate\nC001,M001,1200,1350,2026-10-01\nC002,M002,850,960,2026-10-01\nC003,M003,2100,2280,2026-10-01\n';

export default function Readings() {
  const { user } = useAuth();
  const [readings, setReadings] = useState([]);
  const [meters, setMeters] = useState([]);
  const [manual, setManual] = useState({ meterId: '', previousReading: '', currentReading: '', readingDate: new Date().toISOString().slice(0, 10) });
  const [manualMsg, setManualMsg] = useState(null); // { ok, text }
  const [file, setFile] = useState(null);
  const [genBills, setGenBills] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [uploadErr, setUploadErr] = useState('');
  const fileRef = useRef();

  const load = useCallback(() => {
    api.get('/readings').then((r) => setReadings(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    api.get('/meters').then((r) => {
      setMeters(r.data);
      setManual((m) => ({ ...m, meterId: m.meterId || r.data[0]?.meterId || '' }));
    });
  }, [load]);

  const setM = (k) => (e) => setManual({ ...manual, [k]: e.target.value });

  const submitManual = async (e) => {
    e.preventDefault();
    setManualMsg(null);
    try {
      const body = { ...manual };
      if (body.previousReading === '') delete body.previousReading;
      const r = await api.post('/readings', body);
      setManualMsg({ ok: true, text: `Saved. Units consumed: ${r.data.units}` });
      setManual({ ...manual, previousReading: '', currentReading: '' });
      load();
    } catch (err) {
      setManualMsg({ ok: false, text: errMsg(err) });
    }
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    setUploadErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('generateBills', genBills);
      const r = await api.post('/readings/upload', fd);
      setResult(r.data);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (err) {
      setUploadErr(errMsg(err));
    } finally {
      setUploading(false);
    }
  };

  const canDelete = (r) =>
    !r.billed && (user.role === 'admin' || Date.now() - new Date(r.createdAt).getTime() < 30 * 60 * 1000);

  const removeReading = async (r) => {
    if (!window.confirm(`Delete the reading for ${r.meterId} (${r.period})?`)) return;
    try {
      await api.delete(`/readings/${r._id}`);
      load();
    } catch (err) {
      alert(errMsg(err));
    }
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meter-readings-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Meter Readings</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---- manual entry ---- */}
        <form onSubmit={submitManual} className="card space-y-3 p-5">
          <h2 className="font-semibold">Enter a reading manually</h2>
          <div>
            <label className="label">Meter</label>
            <select className="input" required value={manual.meterId} onChange={setM('meterId')}>
              {meters.map((m) => (
                <option key={m._id} value={m.meterId}>
                  {m.meterId} – {m.consumer?.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Previous reading</label>
              <input className="input" type="number" min="0" step="any" placeholder="auto from last reading" value={manual.previousReading} onChange={setM('previousReading')} />
            </div>
            <div>
              <label className="label">Current reading</label>
              <input className="input" type="number" min="0" step="any" required value={manual.currentReading} onChange={setM('currentReading')} />
            </div>
          </div>
          <div>
            <label className="label">Reading date</label>
            <input className="input" type="date" required value={manual.readingDate} onChange={setM('readingDate')} />
          </div>
          {manualMsg && (
            <p className={`rounded-lg px-3 py-2 text-sm ${manualMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{manualMsg.text}</p>
          )}
          <button className="btn-primary">Save reading</button>
        </form>

        {/* ---- CSV upload ---- */}
        <div className="card space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Import readings from CSV</h2>
            <button className="text-sm font-semibold text-brand-700 hover:underline" onClick={downloadTemplate}>
              Download template
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Required columns: <code>consumerId, meterId, previousReading, currentReading, readingDate</code>
          </p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="input" onChange={(e) => setFile(e.target.files[0] || null)} />
          {user.role === 'admin' && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={genBills} onChange={(e) => setGenBills(e.target.checked)} />
              Generate bills for valid rows automatically
            </label>
          )}
          <button className="btn-accent" disabled={!file || uploading} onClick={upload}>
            {uploading ? 'Importing…' : 'Upload & import'}
          </button>
          {uploadErr && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{uploadErr}</p>}
        </div>
      </div>

      {/* ---- import result ---- */}
      {result && (
        <div className="card space-y-3 p-5">
          <h2 className="font-semibold">Import result</h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-lg bg-slate-100 px-3 py-1.5">Rows: <b>{result.totalRows}</b></span>
            <span className="rounded-lg bg-emerald-100 px-3 py-1.5 text-emerald-700">Accepted: <b>{result.accepted}</b></span>
            <span className="rounded-lg bg-red-100 px-3 py-1.5 text-red-700">Rejected: <b>{result.rejected}</b></span>
            <span className="rounded-lg bg-sky-100 px-3 py-1.5 text-sky-700">Bills generated: <b>{result.billsGenerated}</b></span>
          </div>
          {result.rejectedRows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-red-200">
              <table className="w-full">
                <thead className="bg-red-50">
                  <tr>
                    <th className="th">CSV row</th>
                    <th className="th">Meter</th>
                    <th className="th">Why it was rejected</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {result.rejectedRows.map((r) => (
                    <tr key={r.row}>
                      <td className="td font-semibold">{r.row}</td>
                      <td className="td">{r.data.meterId || '—'}</td>
                      <td className="td text-red-700">{r.errors.join('; ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---- stored readings ---- */}
      <div className="card overflow-x-auto">
        <div className="border-b px-5 py-3 font-semibold">Stored readings</div>
        <table className="w-full">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="th">Period</th>
              <th className="th">Date</th>
              <th className="th">Consumer</th>
              <th className="th">Meter</th>
              <th className="th">Previous</th>
              <th className="th">Current</th>
              <th className="th">Units</th>
              <th className="th">Source</th>
              <th className="th">Billed</th>
              <th className="th text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {readings.map((r) => (
              <tr key={r._id} className="hover:bg-slate-50">
                <td className="td">{r.period}</td>
                <td className="td">{fmtDate(r.readingDate)}</td>
                <td className="td">{r.consumerId}</td>
                <td className="td">{r.meterId}</td>
                <td className="td">{r.previousReading}</td>
                <td className="td">{r.currentReading}</td>
                <td className="td font-semibold">{r.units}</td>
                <td className="td">
                  <Badge type={r.source} />
                </td>
                <td className="td">
                  <Badge type={r.billed ? 'yes' : 'no'}>{r.billed ? 'Yes' : 'No'}</Badge>
                </td>
                <td className="td text-right">
                  {canDelete(r) && (
                    <button className="text-sm font-semibold text-red-600 hover:underline" onClick={() => removeReading(r)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {readings.length === 0 && (
              <tr>
                <td colSpan="10" className="td py-10 text-center text-slate-400">
                  No readings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}