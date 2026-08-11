import React, { useState, useEffect } from 'react';
import {
  Users,
  PlusCircle,
  X,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  Hash,
  ChevronDown,
  Trash2,
  Package,
  Eye,
  ArrowLeft,
  AlertCircle,
  XCircle,
  BarChart2,
  User,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { API_BASE_URL } from './utils/apiBase';
import { mergeWithLocalJobCards } from './utils/localJobCards';
import { hasPermission } from './utils/permissions';

const STORAGE_KEY = 'dailyProductionEntries';

/* ── Dummy data ──────────────────────────────────────────────────────────── */
const DUMMY_ENTRIES = [
  { id: 'demo-1', jobId: '__demo__', workerName: 'Ramesh', qty: 100, note: 'Morning shift', createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: 'demo-2', jobId: '__demo__', workerName: 'Rahul',  qty: 500, note: 'Afternoon batch', createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 'demo-3', jobId: '__demo__', workerName: 'Suresh', qty: 200, note: 'Evening run',     createdAt: new Date(Date.now() - 30 * 60000).toISOString() },
];

const DEMO_JOB = {
  _id: '__demo__',
  jobNumber: 'DEMO-0001',
  partyName: 'Sharma Offset Press',
  jobName: 'Visiting Cards – 1000 pcs',
  jobQty: 1000,
  status: 'in-progress',
  jobDate: new Date().toISOString(),
};

/* ── Storage helpers ─────────────────────────────────────────────────────── */
const loadEntries = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!saved.some(e => e.jobId === '__demo__')) return [...DUMMY_ENTRIES, ...saved];
    return saved;
  } catch { return DUMMY_ENTRIES; }
};

const saveEntries = (entries) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

/* ── Formatters ──────────────────────────────────────────────────────────── */
const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDT = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

/* ── Status config ───────────────────────────────────────────────────────── */
const STATUS = {
  pending:      { label: 'Pending',     icon: Clock,         bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-400' },
  'in-progress':{ label: 'In Progress', icon: AlertCircle,   bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500' },
  completed:    { label: 'Completed',   icon: CheckCircle2,  bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200',dot: 'bg-emerald-500' },
  cancelled:    { label: 'Cancelled',   icon: XCircle,       bg: 'bg-red-50',     text: 'text-red-600',    border: 'border-red-200',    dot: 'bg-red-400' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS[status] || STATUS.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon size={10} /> {cfg.label}
    </span>
  );
};

/* ── Progress bar ────────────────────────────────────────────────────────── */
const ProgressBar = ({ done, total, compact }) => {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const color = pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : pct >= 30 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="w-full">
      {!compact && (
        <div className="flex justify-between mb-1.5">
          <span className="text-xs font-bold text-gray-500">{done.toLocaleString()} / {total.toLocaleString()} produced</span>
          <span className={`text-xs font-black ${pct >= 100 ? 'text-emerald-600' : 'text-blue-600'}`}>{pct}%</span>
        </div>
      )}
      <div className={`w-full ${compact ? 'h-2' : 'h-3'} bg-gray-100 rounded-full overflow-hidden`}>
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {!compact && (
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-400">Remaining: <b className="text-gray-700">{Math.max(0, total - done).toLocaleString()}</b></span>
          {pct >= 100 && <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1"><CheckCircle2 size={10} /> Complete!</span>}
        </div>
      )}
    </div>
  );
};

/* ── Add Entry Modal ─────────────────────────────────────────────────────── */
const AddEntryModal = ({ job, onClose, onAdd }) => {
  const [workerName, setWorkerName] = useState('');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!workerName.trim() || !qty) return;
    onAdd({ id: `entry-${Date.now()}`, jobId: job._id, workerName: workerName.trim(), qty: Number(qty), note: note.trim(), createdAt: new Date().toISOString() });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h3 className="text-base font-black text-gray-900">Add Production Entry</h3>
            <p className="text-xs text-gray-400 mt-0.5">{job.jobNumber} · {job.partyName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Worker Name *</label>
            <input type="text" value={workerName} onChange={e => setWorkerName(e.target.value)} placeholder="e.g. Ramesh, Rahul" required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Quantity Produced *</label>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="e.g. 250" required min={1} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Note (optional)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Morning shift, Machine B" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-bold transition shadow-lg shadow-blue-500/20">Add Entry</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── Detail Drawer ───────────────────────────────────────────────────────── */
const DetailDrawer = ({ job, entries, onClose, onAddEntry, onDeleteEntry }) => {
  const [showModal, setShowModal] = useState(false);
  const jobEntries = entries.filter(e => e.jobId === job._id);
  const totalQty   = Number(job.jobQty) || 0;
  const done       = jobEntries.reduce((s, e) => s + Number(e.qty), 0);
  const left       = Math.max(0, totalQty - done);
  const pct        = totalQty > 0 ? Math.min(100, Math.round((done / totalQty) * 100)) : 0;

  // Group entries by worker
  const byWorker = jobEntries.reduce((acc, e) => {
    acc[e.workerName] = (acc[e.workerName] || 0) + Number(e.qty);
    return acc;
  }, {});

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 to-violet-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold opacity-70 flex items-center gap-1"><Hash size={10} />{job.jobNumber}</span>
                <span className="text-xs font-black uppercase px-2 py-0.5 rounded-full bg-white/20">{job.status || 'pending'}</span>
              </div>
              <h2 className="text-xl font-black">{job.partyName}</h2>
              <p className="text-sm opacity-80 mt-0.5">{job.jobName || '—'}</p>
              <p className="text-xs opacity-60 mt-1 flex items-center gap-1"><Calendar size={10} />{fmtDate(job.jobDate || job.createdAt)}</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition"><X size={18} /></button>
          </div>

          {/* Progress */}
          <div className="mt-4 bg-white/10 rounded-xl p-4">
            <div className="flex justify-between mb-2">
              <span className="text-xs font-bold opacity-80">Production Progress</span>
              <span className="text-sm font-black">{pct}%</span>
            </div>
            <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-emerald-400' : 'bg-white'}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="text-center">
                <p className="text-[10px] font-bold opacity-60 uppercase">Total</p>
                <p className="text-xl font-black">{totalQty.toLocaleString()}</p>
              </div>
              <div className="text-center border-x border-white/20">
                <p className="text-[10px] font-bold opacity-60 uppercase">Done</p>
                <p className="text-xl font-black text-emerald-300">{done.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold opacity-60 uppercase">Remaining</p>
                <p className="text-xl font-black text-amber-300">{left.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Worker summary */}
          {Object.keys(byWorker).length > 0 && (
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Worker Summary</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(byWorker).map(([worker, qty]) => (
                  <div key={worker} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                    <div className="w-6 h-6 rounded-full bg-linear-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-[10px] font-black">
                      {worker.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">{worker}</p>
                      <p className="text-[10px] text-blue-600 font-black">{qty.toLocaleString()} pcs</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entries */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                All Entries <span className="text-gray-600 font-black">({jobEntries.length})</span>
              </p>
              {hasPermission('jobCard', 'create') && (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/20"
                >
                  <PlusCircle size={13} /> Add Entry
                </button>
              )}
            </div>

            {jobEntries.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No production entries yet</p>
                <p className="text-xs mt-1">Click &quot;Add Entry&quot; to start tracking</p>
              </div>
            ) : (
              <div className="space-y-2">
                {jobEntries.slice().reverse().map((entry, idx) => (
                  <div key={entry.id} className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-blue-50/50 rounded-xl transition group">
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-black shrink-0">
                      {entry.workerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900">{entry.workerName}</p>
                        {entry.note && <span className="text-[10px] text-gray-400 truncate">{entry.note}</span>}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{fmtDT(entry.createdAt)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-black text-blue-700">{Number(entry.qty).toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400">pieces</p>
                    </div>
                    {hasPermission('jobCard', 'delete') && (
                      <button
                        onClick={() => onDeleteEntry(entry.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-100 text-red-400 hover:text-red-600 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <AddEntryModal
          job={job}
          onClose={() => setShowModal(false)}
          onAdd={onAddEntry}
        />
      )}
    </>
  );
};

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function DailyJobReport() {
  const [jobCards, setJobCards]   = useState([]);
  const [entries, setEntries]     = useState(loadEntries);
  const [loading, setLoading]     = useState(true);
  const [searchQuery, setSearch]  = useState('');
  const [selectedJob, setSelected]= useState(null);
  const [statusFilter, setStatus] = useState('all');

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/jobcard`);
        const data = res.ok ? await res.json() : [];
        setJobCards([DEMO_JOB, ...mergeWithLocalJobCards(Array.isArray(data) ? data : [])]);
      } catch {
        setJobCards([DEMO_JOB, ...mergeWithLocalJobCards([])]);
      } finally { setLoading(false); }
    };
    fetchJobs();
  }, []);

  const handleAdd = (entry) => {
    const updated = [...entries, entry];
    setEntries(updated);
    saveEntries(updated);
  };

  const handleDelete = (id) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    saveEntries(updated);
  };

  /* Derived */
  const withProgress = jobCards.map(job => {
    const jobEntries = entries.filter(e => e.jobId === job._id);
    const done       = jobEntries.reduce((s, e) => s + Number(e.qty), 0);
    const total      = Number(job.jobQty) || 0;
    const left       = Math.max(0, total - done);
    const pct        = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    return { ...job, _done: done, _total: total, _left: left, _pct: pct, _entries: jobEntries.length };
  });

  const filtered = withProgress.filter(j => {
    if (statusFilter !== 'all' && j.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (j.partyName || '').toLowerCase().includes(q) ||
      (j.jobName   || '').toLowerCase().includes(q) ||
      (j.jobNumber || '').toLowerCase().includes(q)
    );
  });

  const today = new Date().toISOString().split('T')[0];
  const todayEntries = entries.filter(e => new Date(e.createdAt).toISOString().split('T')[0] === today);
  const todayQty     = todayEntries.reduce((s, e) => s + Number(e.qty), 0);
  const totalPending    = withProgress.filter(j => (j.status || 'pending') === 'pending').length;
  const totalInProgress = withProgress.filter(j => j.status === 'in-progress').length;
  const totalCompleted  = withProgress.filter(j => j.status === 'completed').length;

  return (
    <div className="mx-auto mt-6 pb-16 max-w-6xl px-1">
      {/* ─── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <div className="w-1.5 h-7 rounded-full bg-linear-to-b from-blue-500 to-violet-600" />
            Daily Job Report
          </h1>
          <p className="text-sm text-gray-400 mt-1 ml-5">Monitor production progress for all job cards</p>
        </div>
        <div className="bg-linear-to-br from-blue-600 to-violet-600 rounded-2xl px-5 py-3 text-white text-right shadow-lg shadow-blue-500/20">
          <p className="text-[10px] font-bold opacity-70 uppercase tracking-wider">Today's Output</p>
          <p className="text-2xl font-black">{todayQty.toLocaleString()} <span className="text-sm font-medium opacity-70">pcs</span></p>
          <p className="text-xs opacity-60">{todayEntries.length} entries</p>
        </div>
      </div>

      {/* ─── Summary cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Jobs',   value: withProgress.length, icon: FileText,    color: 'bg-gray-50   text-gray-600',   iconBg: 'bg-gray-100' },
          { label: 'Pending',      value: totalPending,         icon: Clock,       color: 'bg-amber-50  text-amber-700',  iconBg: 'bg-amber-100' },
          { label: 'In Progress',  value: totalInProgress,      icon: AlertCircle, color: 'bg-blue-50   text-blue-700',   iconBg: 'bg-blue-100' },
          { label: 'Completed',    value: totalCompleted,        icon: CheckCircle2,color: 'bg-emerald-50 text-emerald-700', iconBg: 'bg-emerald-100' },
        ].map(({ label, value, icon: Icon, color, iconBg }) => (
          <div key={label} className={`${color} rounded-2xl p-4 flex items-center gap-3 border border-white/60 shadow-sm`}>
            <div className={`${iconBg} w-9 h-9 rounded-xl flex items-center justify-center shrink-0`}>
              <Icon size={17} />
            </div>
            <div>
              <p className="text-[10px] font-bold opacity-60 uppercase tracking-wide">{label}</p>
              <p className="text-xl font-black">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by party, job name, job no..."
          className="flex-1 max-w-xs border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
        />
        <div className="flex gap-1.5 flex-wrap">
          {['all','pending','in-progress','completed','cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                statusFilter === s
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {s === 'all' ? 'All Status' : s.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Table ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Loading job cards…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Package size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No job cards found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_1fr_80px_80px_80px_120px_90px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-400">
            <span>Party / Job</span>
            <span>Job Name</span>
            <span className="text-right">Total</span>
            <span className="text-right">Done</span>
            <span className="text-right">Left</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-50">
            {filtered.map(job => (
              <div
                key={job._id}
                className="hover:bg-blue-50/30 transition group"
              >
                {/* Desktop row */}
                <div className="hidden sm:grid grid-cols-[1fr_1fr_80px_80px_80px_120px_90px] gap-4 px-5 py-4 items-center">
                  {/* Party */}
                  <div className="min-w-0">
                    <p className="font-black text-gray-900 text-sm truncate">{job.partyName}</p>
                    <p className="text-[10px] text-violet-500 font-bold flex items-center gap-1 mt-0.5"><Hash size={9} />{job.jobNumber}</p>
                  </div>
                  {/* Job name */}
                  <p className="text-sm text-gray-500 font-medium truncate">{job.jobName || '—'}</p>
                  {/* Total */}
                  <p className="text-sm font-black text-gray-700 text-right">{job._total.toLocaleString()}</p>
                  {/* Done */}
                  <p className="text-sm font-black text-blue-600 text-right">{job._done.toLocaleString()}</p>
                  {/* Left */}
                  <p className={`text-sm font-black text-right ${job._left === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {job._left.toLocaleString()}
                  </p>
                  {/* Status */}
                  <div>
                    <StatusBadge status={job.status || 'pending'} />
                    {/* Mini progress */}
                    <div className="mt-1.5 w-24">
                      <ProgressBar done={job._done} total={job._total} compact />
                    </div>
                  </div>
                  {/* Action */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => setSelected(job)}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm shadow-blue-500/20"
                    >
                      <Eye size={12} /> View
                    </button>
                  </div>
                </div>

                {/* Mobile row */}
                <div className="sm:hidden p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-violet-500 flex items-center gap-1"><Hash size={9} />{job.jobNumber}</span>
                        <StatusBadge status={job.status || 'pending'} />
                      </div>
                      <p className="font-black text-gray-900">{job.partyName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{job.jobName || '—'}</p>
                    </div>
                    <button onClick={() => setSelected(job)} className="bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0">
                      <Eye size={12} /> View
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-gray-50 rounded-lg py-1.5">
                      <p className="text-[9px] text-gray-400 uppercase font-bold">Total</p>
                      <p className="font-black text-gray-700">{job._total.toLocaleString()}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg py-1.5">
                      <p className="text-[9px] text-blue-400 uppercase font-bold">Done</p>
                      <p className="font-black text-blue-700">{job._done.toLocaleString()}</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg py-1.5">
                      <p className="text-[9px] text-amber-400 uppercase font-bold">Left</p>
                      <p className="font-black text-amber-700">{job._left.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <ProgressBar done={job._done} total={job._total} compact />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Detail Drawer ───────────────────────────────────────────────── */}
      {selectedJob && (
        <DetailDrawer
          job={selectedJob}
          entries={entries}
          onClose={() => setSelected(null)}
          onAddEntry={(entry) => { handleAdd(entry); }}
          onDeleteEntry={handleDelete}
        />
      )}
    </div>
  );
}
