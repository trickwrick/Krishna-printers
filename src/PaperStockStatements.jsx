import React, { useState, useEffect } from 'react';
import {
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  User,
  Hash,
  Layers,
} from 'lucide-react';
import { buildPaperStockHistory } from './utils/buildPaperStockHistory.js';
import { API_BASE_URL } from './utils/apiBase';

const PaperStockStatements = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Company paper');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadTransactions = async () => {
    setLoading(true);
    setError('');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const fetchOptions = { signal: controller.signal };

    try {
      const [txRes, stockRes, jobRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/paper-stock/transactions`, fetchOptions),
        fetch(`${API_BASE_URL}/api/paper-stock`, fetchOptions),
        fetch(`${API_BASE_URL}/api/jobcard`, fetchOptions),
      ]);
      clearTimeout(timeoutId);

      if (!stockRes.ok || !jobRes.ok) {
        throw new Error('Stock ya job card data load nahi ho payi.');
      }

      let data = [];
      if (txRes.ok) {
        const txData = await txRes.json();
        data = Array.isArray(txData) ? txData : [];
      }

      if (data.length === 0) {
        const [stocks, jobs] = await Promise.all([stockRes.json(), jobRes.json()]);
        data = buildPaperStockHistory(
          Array.isArray(stocks) ? stocks : [],
          Array.isArray(jobs) ? jobs : [],
        );
      }

      setTransactions(data);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Fetch error:', err);
      setTransactions([]);
      if (err.name === 'AbortError') {
        setError('Server response nahi aa raha. Thodi der baad dubara try karein.');
      } else {
        setError(err.message || 'Transaction history load nahi ho payi.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const filteredTransactions = transactions.filter((item) => {
    const matchesTab = (item.paperSource || 'Company paper') === activeTab;
    const matchesType = typeFilter === 'all' || item.transactionType === typeFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (item.stockName || '').toLowerCase().includes(query) ||
      (item.paperName || '').toLowerCase().includes(query) ||
      (item.partyName || '').toLowerCase().includes(query) ||
      (item.jobNumber || '').toLowerCase().includes(query) ||
      (item.note || '').toLowerCase().includes(query);
    return matchesTab && matchesType && matchesSearch;
  });

  const totalAdded = filteredTransactions
    .filter((t) => t.transactionType === 'add')
    .reduce((sum, t) => sum + (t.quantity || 0), 0);
  const totalDeducted = filteredTransactions
    .filter((t) => t.transactionType === 'deduct')
    .reduce((sum, t) => sum + (t.quantity || 0), 0);

  const formatDateTime = (value) => {
    const date = new Date(value);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="w-full px-4 mt-8 pb-12 text-gray-800 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
            <div className="bg-indigo-600 w-2 h-8 rounded-full" />
            Paper Stock Statements
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium italic">
            Stock add aur deduct ki poori history — date, time, quantity aur party ke saath.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <ArrowUpCircle size={26} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Stock Added</p>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">{totalAdded.toLocaleString()} Sheets</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
            <ArrowDownCircle size={26} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Stock Deducted</p>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">{totalDeducted.toLocaleString()} Sheets</h3>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <div className="flex border-b border-gray-100 bg-white p-2 rounded-2xl shadow-sm gap-2 flex-1">
          {['Company paper', 'Party paper'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-xs transition-all ${
                activeTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab === 'Company paper' ? '🏢 Company Paper' : '🎉 Party Paper'}
            </button>
          ))}
        </div>
        <div className="flex bg-white p-2 rounded-2xl shadow-sm gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'add', label: 'Added' },
            { id: 'deduct', label: 'Deducted' },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setTypeFilter(filter.id)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                typeFilter === filter.id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-bold text-gray-900">Stock Transaction History</h2>
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, party, job..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/50 text-[11px] font-black uppercase text-gray-900 tracking-[0.12em] border-b border-gray-100">
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Stock Name</th>
                <th className="px-6 py-4">Paper Type</th>
                <th className="px-6 py-4 text-center">Action</th>
                <th className="px-6 py-4 text-right">Quantity</th>
                <th className="px-6 py-4">Party / Job</th>
                <th className="px-6 py-4 text-right">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-20 text-center text-gray-400 font-bold animate-pulse uppercase">Loading...</td></tr>
              ) : error ? (
                <tr>
                  <td colSpan="7" className="px-6 py-20 text-center">
                    <p className="text-red-500 font-bold mb-3">{error}</p>
                    <button
                      type="button"
                      onClick={loadTransactions}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700"
                    >
                      Dubara try karein
                    </button>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-20 text-center text-gray-400 italic">
                    Abhi koi transaction nahi hai. Naya stock add karo ya Job Card se paper use karo — history yahan dikhegi.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                        <Calendar size={14} className="text-indigo-500" />
                        {formatDateTime(item.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Layers size={14} className="text-indigo-500" />
                        <div>
                          <p className="font-black text-gray-900 uppercase text-sm">{item.stockName || item.paperName}</p>
                          {item.paperName && item.paperName !== item.stockName && (
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">{item.paperName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                        item.paperType === 'cover'
                          ? 'bg-sky-50 text-sky-700 border border-sky-100'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}>
                        {item.paperType === 'cover' ? 'Cover Paper' : 'Inner Paper'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {item.transactionType === 'add' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase ring-1 ring-emerald-100">
                          <ArrowUpCircle size={12} /> Stock Added
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase ring-1 ring-red-100">
                          <ArrowDownCircle size={12} /> Stock Deducted
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <p className={`font-black text-sm ${item.transactionType === 'add' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {item.transactionType === 'add' ? '+' : '-'}{item.quantity?.toLocaleString()} Sheets
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      {item.transactionType === 'deduct' && item.partyName ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
                            <User size={13} className="text-gray-400" />
                            {item.partyName}
                          </div>
                          {item.jobNumber && (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600">
                              <Hash size={12} />
                              {item.jobNumber}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-gray-400 italic">
                          {item.note || 'Stock feed'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <p className="font-black text-gray-900 text-sm">{item.balanceAfter?.toLocaleString()} Sheets</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaperStockStatements;
