import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  CreditCard,
  Calendar,
  User,
  Hash,
  Trash2,
  CheckCircle2,
  ChevronDown,
  FileText,
  Clock,
  TrendingUp,
  Printer,
} from 'lucide-react';
import { SELLER } from './utils/taxDocumentPrint';
import { printElement } from './utils/printDocument';
import { API_BASE_URL } from './utils/apiBase';
import {
  buildFinancialStatement,
  formatStatementDate,
  formatStatementDateTime,
  getDefaultMonthValue,
  getMonthOptions,
  getPeriodLabel,
} from './utils/buildFinancialStatement';

const fmtAmt = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const Statements = ({ defaultTab = 'transactions' }) => {
  const [statements, setStatements] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonthValue());
  const [statementDateRange, setStatementDateRange] = useState({ start: '', end: '' });
  const [dateFilter, setDateFilter] = useState('1m');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [activeTab, setActiveTab] = useState(defaultTab);
  const showTabs = defaultTab === 'transactions';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stmtRes, invRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/statements`),
        fetch(`${API_BASE_URL}/api/invoice`),
      ]);
      const [stmtData, invData] = await Promise.all([
        stmtRes.json(),
        invRes.json(),
      ]);
      setStatements(stmtData);
      setInvoices(invData);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure? This will also update the invoice balance.")) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/statements/${id}`, { method: 'DELETE' });
        if (res.ok) fetchData();
      } catch (err) {
        console.error("Delete Error:", err);
      }
    }
  };

  const filteredStatements = statements.filter(s => {
    const matchesSearch = s.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (dateFilter === 'all') return true;

    const stmtDate = new Date(s.date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffDays = (now - stmtDate) / (1000 * 60 * 60 * 24);

    switch (dateFilter) {
      case '1v': return diffDays <= 7 && diffDays >= 0;
      case '1m': return diffDays <= 30 && diffDays >= 0;
      case '3m': return diffDays <= 90 && diffDays >= 0;
      case '6m': return diffDays <= 180 && diffDays >= 0;
      case '12m': return diffDays <= 365 && diffDays >= 0;
      case 'custom':
        if (!customRange.start || !customRange.end) return true;
        const start = new Date(customRange.start);
        const end = new Date(customRange.end);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return stmtDate >= start && stmtDate <= end;
      default: return true;
    }
  });

  const monthOptions = useMemo(() => getMonthOptions(24), []);

  const financialStatement = useMemo(
    () => buildFinancialStatement({
      invoices,
      payments: statements,
      periodFilter,
      selectedMonth,
      dateRange: statementDateRange,
      statusFilter: invoiceStatusFilter,
      searchQuery: invoiceSearch,
    }),
    [invoices, statements, periodFilter, selectedMonth, statementDateRange, invoiceStatusFilter, invoiceSearch]
  );

  const {
    displayEntries,
    openingBalance,
    closingBalance,
    totalWithdrawal,
    totalDeposit,
    completeCount,
    pendingCount,
  } = financialStatement;

  const periodLabel = getPeriodLabel(periodFilter, selectedMonth, statementDateRange);

  const handlePrintStatement = () => {
    printElement('printable-financial-statement');
  };

  // Summary stats
  const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
  const totalCollected = invoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
  const totalPending = totalInvoiced - totalCollected;

  return (
    <div className="w-full px-4 mt-8 pb-12 text-gray-800 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
            <div className="bg-emerald-600 w-2 h-8 rounded-full" />
            Financial Statements
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium italic">
            {defaultTab === 'invoices'
              ? 'View all invoice records, balances, and payment status.'
              : 'Track payment records, invoice balances, and revenue logs.'}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5 group hover:shadow-md transition-all">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
            <TrendingUp size={26} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Invoiced</p>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">₹{totalInvoiced.toLocaleString()}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5 group hover:shadow-md transition-all">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
            <CreditCard size={26} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Collected</p>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">₹{totalCollected.toLocaleString()}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5 group hover:shadow-md transition-all">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all">
            <Clock size={26} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Balance Pending</p>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">₹{totalPending.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {showTabs && (
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'transactions'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100'
              : 'bg-white text-gray-500 border border-gray-200 hover:border-emerald-400'
            }`}
        >
          <CreditCard size={16} />
          Transaction History
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'invoices'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100'
              : 'bg-white text-gray-500 border border-gray-200 hover:border-emerald-400'
            }`}
        >
          <FileText size={16} />
          Invoice Statements
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${activeTab === 'invoices' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
            {invoices.length}
          </span>
        </button>
      </div>
      )}

      {/* TRANSACTIONS TAB */}
      {(showTabs ? activeTab === 'transactions' : false) && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-bold text-gray-900">Transaction History</h2>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {/* Date Filter */}
              <div className="relative w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 shadow-sm hover:border-emerald-500 transition-all min-w-37.5 justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-emerald-500" />
                    <span>
                      {dateFilter === 'custom' ? 'Custom Range' :
                        dateFilter === '1v' ? 'Last Week' :
                          dateFilter === '1m' ? 'Last Month' :
                            dateFilter === '3m' ? 'Last 3 Months' :
                              dateFilter === '6m' ? 'Last 6 Months' :
                                'Last 12 Months'}
                    </span>
                  </div>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                </button>
                {isFilterOpen && (
                  <div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 py-2">
                    {[
                      { id: 'custom', label: 'Custom Range' },
                      { id: '1v', label: 'Last Week' },
                      { id: '1m', label: 'Last Month' },
                      { id: '3m', label: 'Last 3 Months' },
                      { id: '6m', label: 'Last 6 Months' },
                      { id: '12m', label: 'Last 12 Months' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => { setDateFilter(opt.id); setIsFilterOpen(false); }}
                        className={`flex items-center justify-between w-full px-5 py-2.5 text-sm font-medium hover:bg-emerald-50 ${dateFilter === opt.id ? 'text-emerald-600 font-bold' : 'text-gray-600'
                          }`}
                      >
                        {opt.label}
                        {dateFilter === opt.id && <CheckCircle2 size={14} className="text-emerald-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {dateFilter === 'custom' && (
                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                  <input type="date" className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    value={customRange.start}
                    onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                    onClick={(e) => { try { e.target.showPicker(); } catch (_) { } }}
                  />
                  <span className="text-gray-400 text-sm">to</span>
                  <input type="date" className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    value={customRange.end}
                    onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                    onClick={(e) => { try { e.target.showPicker(); } catch (_) { } }}
                  />
                </div>
              )}

              <div className="relative w-full md:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search transactions..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto min-h-75">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">
                  <th className="px-8 py-4">Date & Reference</th>
                  <th className="px-8 py-4">Party Name</th>
                  <th className="px-8 py-4">Method</th>
                  <th className="px-8 py-4 text-right">Amount</th>
                  <th className="px-8 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan="5" className="px-8 py-20 text-center text-gray-400 font-bold animate-pulse uppercase">Processing Records...</td></tr>
                ) : filteredStatements.length === 0 ? (
                  <tr><td colSpan="5" className="px-8 py-20 text-center text-gray-400 italic">No transactions found.</td></tr>
                ) : (
                  filteredStatements.map((item) => (
                    <tr key={item._id} className="hover:bg-emerald-50/10 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-gray-100 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                            <Calendar size={18} />
                          </div>
                          <div>
                            <p className="font-black text-gray-900 text-sm">{new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Hash size={9} className="text-gray-400" />
                              <span className="text-[10px] font-black text-emerald-600 uppercase">{item.invoiceNumber}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <User size={13} className="text-gray-400" />
                          <p className="font-bold text-gray-900 text-sm">{item.partyName}</p>
                        </div>
                        {item.notes && <p className="text-[10px] text-gray-400 italic mt-0.5">{item.notes}</p>}
                      </td>
                      <td className="px-8 py-5">
                        <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase ring-1 ring-blue-100">
                          {item.paymentMethod}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <p className="text-base font-black text-gray-900">₹{item.amount?.toLocaleString()}</p>
                        <p className="text-[10px] font-black text-emerald-600 uppercase mt-0.5">Verified Inflow</p>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <button onClick={() => handleDelete(item._id)}
                          className="p-2.5 text-red-400 hover:text-white hover:bg-red-500 rounded-xl transition-all">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INVOICE STATEMENTS TAB — Bank Statement Style */}
      {(!showTabs || activeTab === 'invoices') && (
        <>
          <div className="flex flex-col gap-3 mb-6">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
              <div className="flex bg-white p-2 rounded-2xl shadow-sm gap-2 w-fit">
                {[
                  { id: 'complete', label: 'Complete', count: completeCount },
                  { id: 'pending', label: 'Pending', count: pendingCount },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setInvoiceStatusFilter((prev) => (prev === filter.id ? 'all' : filter.id))}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                      invoiceStatusFilter === filter.id
                        ? filter.id === 'complete'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-red-500 text-white'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {filter.label}
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      invoiceStatusFilter === filter.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {filter.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col lg:flex-row flex-wrap gap-3 xl:ml-auto">
                <div className="flex flex-wrap bg-white p-2 rounded-2xl shadow-sm gap-2">
                  {[
                    { id: 'all', label: 'All Statements' },
                    { id: 'month', label: 'By Month' },
                    { id: 'range', label: 'By Date' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setPeriodFilter(filter.id)}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                        periodFilter === filter.id ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {periodFilter === 'month' && (
                  <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                    <Calendar size={16} className="text-indigo-500 ml-2" />
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="px-3 py-2 rounded-xl text-sm font-bold text-gray-700 outline-none bg-transparent cursor-pointer"
                    >
                      {monthOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {periodFilter === 'range' && (
                  <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                    <Calendar size={16} className="text-indigo-500 ml-2" />
                    <input
                      type="date"
                      value={statementDateRange.start}
                      onChange={(e) => setStatementDateRange({ ...statementDateRange, start: e.target.value })}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <span className="text-gray-400 text-sm font-bold">to</span>
                    <input
                      type="date"
                      value={statementDateRange.end}
                      onChange={(e) => setStatementDateRange({ ...statementDateRange, end: e.target.value })}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 no-print">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Account Statement</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {periodLabel}
                {invoiceStatusFilter === 'complete' ? ' • Complete entries only' : invoiceStatusFilter === 'pending' ? ' • Pending entries only' : ''}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search party, invoice, ref..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={handlePrintStatement}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all"
              >
                <Printer size={16} />
                Print Statement
              </button>
            </div>
          </div>

          <div id="printable-financial-statement" className="financial-statement-print bg-white">
            <div className="financial-statement-header">
              <div
                className="financial-statement-header-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr minmax(260px, 38%)',
                  gridTemplateRows: 'auto auto',
                  columnGap: '1.5rem',
                  rowGap: '1rem',
                  alignItems: 'start',
                }}
              >
                <div className="financial-statement-doc-title-block" style={{ gridColumn: 2, gridRow: 1 }}>
                  <p className="financial-statement-doc-title-line">A C C O U N T</p>
                  <p className="financial-statement-doc-title-line financial-statement-doc-title-line-second">S T A T E M E N T</p>
                </div>

                <div className="financial-statement-company" style={{ gridColumn: 1, gridRow: 2 }}>
                  <h3>{SELLER.name}</h3>
                  <p>{SELLER.address}</p>
                  <p>{SELLER.tel}, {SELLER.email}</p>
                  <p><span className="financial-statement-label">MSME REGD NO :-</span> {SELLER.msmeRegNo}</p>
                  <p><span className="financial-statement-label">GSTIN :</span> {SELLER.gstin}</p>
                </div>

                <div className="financial-statement-bank" style={{ gridColumn: 2, gridRow: 2, textAlign: 'right' }}>
                  <p className="financial-statement-bank-label">Bank Details</p>
                  <p><span className="financial-statement-muted">Account Holder:</span> <span className="financial-statement-strong">{SELLER.bank.holder}</span></p>
                  <p><span className="financial-statement-muted">Bank:</span> <span className="financial-statement-strong">{SELLER.bank.name}</span></p>
                  <p><span className="financial-statement-muted">A/c No:</span> <span className="financial-statement-strong">{SELLER.bank.account}</span></p>
                  <p><span className="financial-statement-muted">IFSC:</span> <span className="financial-statement-strong">{SELLER.bank.ifsc}</span></p>
                  <p><span className="financial-statement-muted">Branch:</span> <span className="financial-statement-strong">{SELLER.bank.branch}</span></p>
                </div>
              </div>

              <div className="financial-statement-summary-grid">
                <div className="financial-statement-summary-card">
                  <p className="financial-statement-summary-label">Statement Period</p>
                  <p className="financial-statement-summary-value">{periodLabel}</p>
                </div>
                <div className="financial-statement-summary-card">
                  <p className="financial-statement-summary-label">Opening Balance</p>
                  <p className="financial-statement-summary-value">{fmtAmt(openingBalance)}</p>
                </div>
                <div className="financial-statement-summary-card">
                  <p className="financial-statement-summary-label">Generated On</p>
                  <p className="financial-statement-summary-value">{formatStatementDateTime(new Date())}</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto min-h-75 financial-statement-table-wrap">
              <table className="w-full text-left border-collapse financial-statement-table" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '9%' }} />
                  <col className="financial-statement-col-value-date" style={{ width: '9%' }} />
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-indigo-600 text-white text-sm font-black uppercase tracking-wide">
                    <th className="px-4 py-3 border border-indigo-500">Txn Date</th>
                    <th className="financial-statement-col-value-date px-4 py-3 border border-indigo-500">Value Date</th>
                    <th className="financial-statement-col-particulars px-4 py-3 border border-indigo-500">Particulars</th>
                    <th className="px-4 py-3 border border-indigo-500">Chq / Ref No.</th>
                    <th className="px-4 py-3 border border-indigo-500 text-right">Withdrawal (Dr)</th>
                    <th className="px-4 py-3 border border-indigo-500 text-right">Deposit (Cr)</th>
                    <th className="px-4 py-3 border border-indigo-500 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-20 text-center text-gray-400 font-bold animate-pulse uppercase border border-gray-100">
                        Loading Statement...
                      </td>
                    </tr>
                  ) : (
                    <>
                      {periodFilter !== 'all' && (
                        <tr className="bg-amber-50/70">
                          <td className="px-4 py-3 border border-gray-200 text-base font-bold text-gray-700" colSpan="4">
                            Opening Balance b/f
                          </td>
                          <td className="px-4 py-3 border border-gray-200 text-right text-base font-bold text-gray-400">—</td>
                          <td className="px-4 py-3 border border-gray-200 text-right text-base font-bold text-gray-400">—</td>
                          <td className="px-4 py-3 border border-gray-200 text-right text-base font-black text-gray-900">{fmtAmt(openingBalance)}</td>
                        </tr>
                      )}

                      {displayEntries.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-6 py-16 text-center text-gray-400 italic font-medium border border-gray-100">
                            Is period / filter ke liye koi entry nahi mili.
                          </td>
                        </tr>
                      ) : (
                        displayEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-3 border border-gray-200 text-base font-bold text-gray-800">
                              {formatStatementDate(entry.date)}
                            </td>
                            <td className="financial-statement-col-value-date px-4 py-3 border border-gray-200 text-base font-semibold text-gray-600">
                              {formatStatementDate(entry.date)}
                            </td>
                            <td className="financial-statement-col-particulars px-4 py-3 border border-gray-200 text-base font-semibold text-gray-800 wrap-break-word">
                              {entry.particulars}
                            </td>
                            <td className="px-4 py-3 border border-gray-200 text-base font-black text-indigo-700 break-all">
                              {entry.refNo}
                            </td>
                            <td className="px-4 py-3 border border-gray-200 text-right text-base font-black text-red-600">
                              {entry.withdrawal > 0 ? fmtAmt(entry.withdrawal) : '—'}
                            </td>
                            <td className="px-4 py-3 border border-gray-200 text-right text-base font-black text-emerald-600">
                              {entry.deposit > 0 ? fmtAmt(entry.deposit) : '—'}
                            </td>
                            <td className="px-4 py-3 border border-gray-200 text-right text-base font-black text-gray-900">
                              {fmtAmt(entry.balanceAfter)}
                            </td>
                          </tr>
                        ))
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {!loading && displayEntries.length > 0 && (
              <div className="financial-statement-totals px-6 py-4 bg-gray-50 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Withdrawal (Dr)</p>
                  <p className="font-black text-red-600 mt-1">{fmtAmt(totalWithdrawal)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Deposit (Cr)</p>
                  <p className="font-black text-emerald-600 mt-1">{fmtAmt(totalDeposit)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Closing Balance</p>
                  <p className="font-black text-gray-900 mt-1">{fmtAmt(closingBalance)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Entries in Statement</p>
                  <p className="font-black text-indigo-700 mt-1">{displayEntries.length}</p>
                </div>
              </div>
            )}

            <div className="financial-statement-footer px-6 py-3 border-t border-gray-100 text-[10px] text-gray-400 italic text-center">
              This is a computer generated statement and does not require signature. | {SELLER.name} | {SELLER.email}
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default Statements;
