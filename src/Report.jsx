import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ChevronDown,
  Calendar,
  IndianRupee,
  User,
  Hash,
  ExternalLink,
  RefreshCw,
  Download,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import { API_BASE_URL } from './utils/apiBase';
import { mergeWithLocalJobCards, updateLocalJobCardField } from './utils/localJobCards';
import { downloadAsPDF } from './utils/pdfExport';
import * as XLSX from 'xlsx';
import DailyWorkReport from './DailyWorkReport';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    ring: 'ring-amber-100',
    dot: 'bg-amber-400',
  },
  'in-progress': {
    label: 'In Progress',
    icon: AlertCircle,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    ring: 'ring-blue-100',
    dot: 'bg-blue-500',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-100',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-50',
    ring: 'ring-red-100',
    dot: 'bg-red-400',
  },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ring-1 ${cfg.bg} ${cfg.color} ${cfg.ring}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
};

const StatusDropdown = ({ jobId, currentStatus, onUpdate }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = async (newStatus) => {
    if (newStatus === currentStatus) { setOpen(false); return; }
    setLoading(true);
    setOpen(false);

    // Update localStorage immediately (works for local-only cards)
    updateLocalJobCardField(jobId, { status: newStatus });
    onUpdate(jobId, newStatus);

    // Best-effort server sync
    try {
      await fetch(`${API_BASE_URL}/api/jobcard/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      // Server unavailable — local update already applied
    } finally {
      setLoading(false);
    }
  };

  const cfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.pending;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ring-1 transition-all hover:opacity-80 ${cfg.bg} ${cfg.color} ${cfg.ring} ${loading ? 'animate-pulse' : ''}`}
      >
        {loading ? <RefreshCw size={11} className="animate-spin" /> : <cfg.icon size={11} />}
        {cfg.label}
        <ChevronDown size={9} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden min-w-36 animate-in fade-in slide-in-from-top-2 duration-150">
          {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-left text-xs font-bold transition-colors hover:bg-gray-50 ${key === currentStatus ? `${conf.bg} ${conf.color}` : 'text-gray-700'}`}
            >
              <span className={`w-2 h-2 rounded-full ${conf.dot}`} />
              {conf.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Report() {
  const navigate = useNavigate();
  const location = useLocation();
  const [jobCards, setJobCards] = useState([]);
  const [reportType, setReportType] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('type') || 'job-card';
  });
  const [reportDropdownOpen, setReportDropdownOpen] = useState(false);
  const reportRef = useRef(null);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const dateRef = useRef(null);
  const [dateFilter, setDateFilter] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('dateFilter') || 'all';
  });
  const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' });

  const handleReportSelect = (type) => {
    setReportType(type);
    setReportDropdownOpen(false);
    // Update URL without reloading
    const params = new URLSearchParams(location.search);
    params.set('type', type);
    navigate(`/report?${params.toString()}`, { replace: true });
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeParam = params.get('type');
    if (typeParam && typeParam !== reportType) {
      setReportType(typeParam);
    }
  }, [location.search]);

  // Close dropdown when clicking outside
  const handleDateSelect = (filter) => {
    setDateFilter(filter);
    setDateDropdownOpen(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (reportRef.current && !reportRef.current.contains(e.target)) setReportDropdownOpen(false);
      if (dateRef.current && !dateRef.current.contains(e.target)) setDateDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const reportDropdown = (
    <div ref={reportRef} className="relative inline-block text-left">
      <button
        onClick={() => setReportDropdownOpen(!reportDropdownOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
      >
        {reportType === 'job-card' ? 'Job Card Report' : 'Daily Work Report'}
        <ChevronDown className={`transition-transform ${reportDropdownOpen ? 'rotate-180' : ''}`} size={12} />
      </button>
      {reportDropdownOpen && (
        <div className="absolute mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
          <div className="py-1">
            <button
              onClick={() => handleReportSelect('job-card')}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
              Job Card Report
            </button>
            <button
              onClick={() => handleReportSelect('daily-work')}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
              Daily Work Report
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const dateDropdown = (
    <div ref={dateRef} className="relative inline-block text-left">
      <button
        onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
      >
        {(() => {
          switch (dateFilter) {
            case 'today': return 'Today';
            case 'week': return 'This Week';
            case 'month': return 'This Month';
            case 'custom': return 'Custom Range';
            default: return 'All Time';
          }
        })()}
        <ChevronDown className={`transition-transform ${dateDropdownOpen ? 'rotate-180' : ''}`} size={12} />
      </button>
      {dateDropdownOpen && (
        <div className="absolute mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
          <div className="py-1">
            <button onClick={() => handleDateSelect('all')} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">All Time</button>
            <button onClick={() => handleDateSelect('today')} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">Today</button>
            <button onClick={() => handleDateSelect('week')} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">This Week</button>
            <button onClick={() => handleDateSelect('month')} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">This Month</button>
            <button onClick={() => handleDateSelect('custom')} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">Custom Range</button>
          </div>
        </div>
      )}
    </div>
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');



  const fetchJobCards = async () => {
    setLoading(true);
    setError('');
    // Show local cards immediately
    const localData = mergeWithLocalJobCards([]);
    if (localData.length > 0) setJobCards(localData);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(`${API_BASE_URL}/api/jobcard`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          const merged = mergeWithLocalJobCards(Array.isArray(data) ? data : []);
          setJobCards(merged);
        } else {
          console.error('Report fetch error:', res.status);
          setError(`Server error (${res.status}). Showing locally saved cards.`);
          setJobCards(mergeWithLocalJobCards([]));
        }
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      console.error('Report fetch error:', err);
      if (err?.name === 'AbortError') {
        setError('Server timeout. Please check your connection.');
      } else {
        setError('Could not connect to server. Showing locally saved cards.');
      }
      setJobCards(mergeWithLocalJobCards([]));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobCards(); }, []);

  const handleStatusUpdate = (jobId, newStatus) => {
    setJobCards((prev) => prev.map((j) => j._id === jobId ? { ...j, status: newStatus } : j));
  };

  const getDateBoundary = () => {
    const now = new Date();
    if (dateFilter === 'today') {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      return start;
    }
    if (dateFilter === 'week') {
      const start = new Date(now); start.setDate(now.getDate() - 7);
      return start;
    }
    if (dateFilter === 'month') {
      const start = new Date(now); start.setDate(1); start.setHours(0, 0, 0, 0);
      return start;
    }
    return null;
  };

  const filtered = jobCards.filter((card) => {
    const status = card.status || 'pending';
    if (statusFilter !== 'all' && status !== statusFilter) return false;

    const cardDate = new Date(card.jobDate || card.createdAt);

    if (dateFilter === 'custom') {
      if (customDateRange.from) {
        const fromDate = new Date(customDateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        if (cardDate < fromDate) return false;
      }
      if (customDateRange.to) {
        const toDate = new Date(customDateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (cardDate > toDate) return false;
      }
    } else {
      const boundary = getDateBoundary();
      if (boundary && cardDate < boundary) return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (card.partyName || '').toLowerCase().includes(q) ||
        (card.jobName || '').toLowerCase().includes(q) ||
        (card.jobNumber || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Summary counts (from all job cards, not filtered)
  const counts = {
    total: jobCards.length,
    pending: jobCards.filter((c) => (c.status || 'pending') === 'pending').length,
    'in-progress': jobCards.filter((c) => c.status === 'in-progress').length,
    completed: jobCards.filter((c) => c.status === 'completed').length,
    cancelled: jobCards.filter((c) => c.status === 'cancelled').length,
  };

  const today = new Date().toISOString().split('T')[0];
  const todayCount = jobCards.filter((c) => {
    const d = new Date(c.jobDate || c.createdAt);
    return d.toISOString().split('T')[0] === today;
  }).length;

  const formatDate = (val) => {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const exportToExcel = () => {
    const headers = ['Date', 'Job No.', 'Party Name', 'Job Name', 'Qty', 'Amount', 'Status'];
    const rows = filtered.map((card) => [
      formatDate(card.jobDate || card.createdAt),
      card.jobNumber || '',
      card.partyName || '',
      card.jobName || '',
      card.jobQty || '',
      card.totalAmount || 0,
      card.status || 'pending',
    ]);
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    // Auto-adjust column widths
    const colWidths = headers.map((_, colIndex) => {
      let maxLen = headers[colIndex].length;
      rows.forEach(row => {
        const cellValue = row[colIndex] ? row[colIndex].toString() : '';
        if (cellValue.length > maxLen) {
          maxLen = cellValue.length;
        }
      });
      return { wch: maxLen + 2 };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Job Cards');
    
    XLSX.writeFile(workbook, `Job_Cards_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    downloadAsPDF('report-table-container', `Job_Cards_Report_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="w-full px-4 mt-8 pb-12 text-gray-800 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
            <div className="bg-violet-600 w-2 h-8 rounded-full" />
            {reportType === 'job-card' ? 'Job Card Report' : 'Daily Work Report'}
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium italic">
            {reportType === 'job-card' ? 'Track status, monitor workload, and update job card progress.' : 'Summary of daily activities and work performed.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {reportDropdown}
          {dateDropdown}
          {dateFilter === 'custom' && (
            <div className="flex bg-white p-1 rounded-lg border border-gray-200 gap-1 items-center shadow-sm h-8">
              <input
                type="date"
                value={customDateRange.from}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="px-1 text-xs text-gray-700 outline-none bg-transparent font-medium"
                title="From Date"
              />
              <span className="text-gray-400 text-xs font-bold">-</span>
              <input
                type="date"
                value={customDateRange.to}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="px-1 text-xs text-gray-700 outline-none bg-transparent font-medium"
                title="To Date"
              />
            </div>
          )}
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-xl text-sm font-bold hover:bg-green-100 transition-all shadow-sm"
          >
            <FileSpreadsheet size={15} />
            Excel
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 transition-all shadow-sm"
          >
            <FileText size={15} />
            PDF
          </button>
          <button
            onClick={fetchJobCards}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-semibold">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
          <button onClick={fetchJobCards} className="ml-auto flex items-center gap-1.5 text-xs font-black bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-all">
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {reportType === 'daily-work' ? (
        <DailyWorkReport jobCards={filtered} />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Total Jobs', value: counts.total, icon: Briefcase, color: 'text-gray-700', bg: 'bg-gray-100' },
          { label: "Today's", value: todayCount, icon: Calendar, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Pending', value: counts.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'In Progress', value: counts['in-progress'], icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completed', value: counts.completed, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Cancelled', value: counts.cancelled, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center ${s.color}`}>
              <s.icon size={18} />
            </div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by party, job name, job no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
          />
        </div>

        <div className="flex bg-white p-1.5 rounded-xl border border-gray-200 gap-1">
          {[
            { id: 'all', label: 'All Status' },
            { id: 'pending', label: '🟡 Pending' },
            { id: 'in-progress', label: '🔵 In Progress' },
            { id: 'completed', label: '🟢 Completed' },
            { id: 'cancelled', label: '🔴 Cancelled' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${statusFilter === f.id ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex bg-white p-1.5 rounded-xl border border-gray-200 gap-1">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'custom', label: 'Custom Range' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${dateFilter === f.id ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div id="report-table-container" className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">
            Showing <span className="text-violet-600">{filtered.length}</span> job cards
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100">
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Job No.</th>
                <th className="px-5 py-4">Party Name</th>
                <th className="px-5 py-4">Job Name</th>
                <th className="px-5 py-4">Qty</th>
                <th className="px-5 py-4 text-right">Amount</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-center">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-5 py-20 text-center text-gray-400 font-bold animate-pulse uppercase tracking-widest text-sm">
                    Loading Report...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-20 text-center text-gray-400 italic">
                    No job cards found for the selected filters.
                  </td>
                </tr>
              ) : (
                filtered.map((card) => (
                  <tr key={card._id} className="hover:bg-violet-50/20 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 font-semibold">
                        <Calendar size={13} className="text-violet-400" />
                        {formatDate(card.jobDate || card.createdAt)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-black text-violet-600">
                        <Hash size={12} />
                        {card.jobNumber || '—'}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                          <User size={13} className="text-violet-600" />
                        </div>
                        <p className="font-black text-gray-900 text-sm group-hover:text-violet-700 transition-colors">
                          {card.partyName || '—'}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-gray-700 max-w-xs truncate">{card.jobName || '—'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-gray-700">{card.jobQty || '—'}</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 font-black text-gray-900 text-sm">
                        <IndianRupee size={13} />
                        {(Number(card.totalAmount) || 0).toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusDropdown
                        jobId={card._id}
                        currentStatus={card.status || 'pending'}
                        onUpdate={handleStatusUpdate}
                      />
                    </td>
                      <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => navigate('/job-card-list')}
                        className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                        title="View Job Card"
                      >
                        <ExternalLink size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
