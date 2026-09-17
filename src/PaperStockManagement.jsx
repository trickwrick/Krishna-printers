import React, { useState, useEffect } from 'react';
import { Layers, Plus, Search, AlertTriangle, Edit2, Trash2, CheckCircle2, Info, ArrowUpRight, RefreshCw, Eye, X } from 'lucide-react';
import ActionButtons from './ActionButtons';
import { mergePaperSizes, rememberPaperSizes } from './utils/paperStockSizes';
import { API_BASE_URL } from './utils/apiBase';
import { hasPermission } from './utils/permissions';

const buildStockName = (coverName, innerName) => {
  const cover = (coverName || '').trim();
  const inner = (innerName || '').trim();
  if (cover && inner && cover !== inner) return `${cover} / ${inner}`;
  return cover || inner || '';
};

const PaperStockManagement = () => {
  const [stock, setStock] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
    const [viewingStock, setViewingStock] = useState(null);
  const [stockHistory, setStockHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [addingStockToItem, setAddingStockToItem] = useState(null);
  const [addStockForm, setAddStockForm] = useState({ coverQuantity: '', innerQuantity: '', challanNo: '', invoiceNo: '', date: new Date().toISOString().split('T')[0] });
  const [editingId, setEditingId] = useState(null);
  const [currentStock, setCurrentStock] = useState({ cover: 0, inner: 0 });
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    coverPartyName: '',
    coverName: '',
    coverSupplier: '',
    innerPartyName: '',
    innerName: '',
    innerSupplier: '',
    gsm: '',
    quantity: '',
    coverGSM: '',
    coverQuantity: '',
    coverPaperSize: '',
    innerGSM: '',
    innerQuantity: '',
    innerPaperSize: '',
    description: '',
    lowStockThreshold: 100,
    paperSource: 'Company paper'
  });

  const [activeTab, setActiveTab] = useState('Company paper');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const gsmGuide = [
    { type: 'Visiting Card', gsm: '300–350 GSM', paper: 'Art Card', icon: '📇' },
    { type: 'Brochure', gsm: '130–170 GSM', paper: 'Gloss/Matte', icon: '📖' },
    { type: 'Book', gsm: '70–100 GSM', paper: 'Offset', icon: '📚' },
    { type: 'Poster', gsm: '170–250 GSM', paper: 'Art Paper', icon: '🖼️' }
  ];

  useEffect(() => {
    fetchStock();
  }, []);

  
  useEffect(() => {
    if (viewingStock) {
      setLoadingHistory(true);
      fetch(`${API_BASE_URL}/api/paper-stock/transactions`)
        .then(res => res.json())
        .then(data => {
          const filtered = data.filter(t => t.stockId === viewingStock._id && t.transactionType === 'add');
          setStockHistory(filtered);
          setLoadingHistory(false);
        })
        .catch(err => {
          console.error(err);
          setLoadingHistory(false);
        });
    } else {
      setStockHistory([]);
    }
  }, [viewingStock]);


  const fetchStock = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/paper-stock`);
      const data = await res.json();
      setStock(mergePaperSizes(data));
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.coverName.trim() && !formData.innerName.trim()) {
      setMessage({ type: 'error', text: 'Enter at least one paper name in Cover or Inner section.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const url = editingId 
      ? `${API_BASE_URL}/api/paper-stock/${editingId}`
      : `${API_BASE_URL}/api/paper-stock`;
    
    const method = editingId ? 'PUT' : 'POST';

    const finalCoverQty = editingId
      ? (Number(currentStock.cover) || 0) + (Number(formData.coverQuantity) || 0)
      : (Number(formData.coverQuantity) || 0);
    const finalInnerQty = editingId
      ? (Number(currentStock.inner) || 0) + (Number(formData.innerQuantity) || 0)
      : (Number(formData.innerQuantity) || 0);

    const submissionData = {
      ...formData,
      name: buildStockName(formData.coverName, formData.innerName),
      gsm: formData.coverGSM || formData.innerGSM || 0,
      coverQuantity: finalCoverQty,
      innerQuantity: finalInnerQty,
      quantity: finalCoverQty + finalInnerQty
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });
      const data = await res.json();

      if (res.ok) {
        rememberPaperSizes(data._id, formData.coverPaperSize, formData.innerPaperSize);
        setMessage({ type: 'success', text: editingId ? 'Stock updated!' : 'Paper added to stock!' });
        setFormData({ 
          coverPartyName: '',
          coverName: '',
          coverSupplier: '',
          innerPartyName: '',
          innerName: '',
          innerSupplier: '',
          gsm: '', 
          quantity: '', 
          coverGSM: '', 
          coverQuantity: '',
          coverPaperSize: '',
          innerGSM: '', 
          innerQuantity: '',
          innerPaperSize: '',
          description: '', 
          lowStockThreshold: 100, 
          paperSource: 'Company paper' 
        });
        setIsAdding(false);
        setEditingId(null);
        setCurrentStock({ cover: 0, inner: 0 });
        fetchStock();
      } else {
        setMessage({ type: 'error', text: data.error || 'Something went wrong' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Server error' });
    }

    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  
  const handleDuplicate = (item) => {
    setEditingId(null);
    setFormData({
      coverPartyName: item.coverPartyName || '',
      coverName: item.coverName || '',
      coverSupplier: item.coverSupplier || '',
      innerPartyName: item.innerPartyName || '',
      innerName: item.innerName || '',
      innerSupplier: item.innerSupplier || '',
      gsm: item.gsm || '',
      coverGSM: item.coverGSM || '',
      innerGSM: item.innerGSM || '',
      coverPaperSize: item.coverPaperSize || '',
      innerPaperSize: item.innerPaperSize || '',
      description: item.description || '',
      paperSource: item.paperSource || 'Company paper',
      coverQuantity: '',
      innerQuantity: ''
    });
    setCurrentStock({ cover: 0, inner: 0 });
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  const handleEdit = (item) => {
    setCurrentStock({
      cover: item.coverQuantity !== undefined ? Number(item.coverQuantity) : Number(item.quantity || 0),
      inner: Number(item.innerQuantity || 0),
    });
    setFormData({
      coverPartyName: item.coverPartyName || '',
      coverName: item.coverName || item.name || '',
      coverSupplier: item.coverSupplier || '',
      innerPartyName: item.innerPartyName || '',
      innerName: item.innerName || item.name || '',
      innerSupplier: item.innerSupplier || '',
      gsm: item.gsm || '',
      quantity: item.quantity || '',
      coverGSM: item.coverGSM !== undefined ? item.coverGSM : (item.gsm || ''),
      coverQuantity: '',
      coverPaperSize: item.coverPaperSize || '',
      innerGSM: item.innerGSM || '',
      innerQuantity: '',
      innerPaperSize: item.innerPaperSize || '',
      description: item.description || '',
      lowStockThreshold: item.lowStockThreshold || 100,
      paperSource: item.paperSource || 'Company paper'
    });
    setEditingId(item._id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  
  const handleSync = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/paper-stock/reconcile/${id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Stock Reconciled Successfully');
        fetchStock();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Error reconciling stock: ' + err.message);
    }
  };


  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this paper stock?")) return;
    try {
      await fetch(`${API_BASE_URL}/api/paper-stock/${id}`, { method: 'DELETE' });
      fetchStock();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleQuickAddSubmit = async (e) => {
    e.preventDefault();
    if (!addingStockToItem) return;
    
    if (!addStockForm.coverQuantity && !addStockForm.innerQuantity) {
      alert('Please enter quantity to add');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/paper-stock/${addingStockToItem._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addingStockToItem,
          coverQuantity: (Number(addingStockToItem.coverQuantity) || 0) + (Number(addStockForm.coverQuantity) || 0),
          innerQuantity: (Number(addingStockToItem.innerQuantity) || 0) + (Number(addStockForm.innerQuantity) || 0),
          challanNo: addStockForm.challanNo,
          invoiceNo: addStockForm.invoiceNo,
          createdAt: addStockForm.date,
          isQuickAdd: true
        }),
      });
      if (res.ok) {
        setAddingStockToItem(null);
        fetchStock();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add stock');
      }
    } catch (err) {
      alert('Error adding stock: ' + err.message);
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-gray-800 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <div className="bg-blue-600 w-2 h-8 rounded-full" />
            Paper Stock Management
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium italic">Track inventory and auto-deduct sheets from Job Cards.</p>
        </div>
        {hasPermission('paperStock', 'create') && (
          <button
            onClick={() => { setIsAdding(!isAdding); setEditingId(null); setCurrentStock({ cover: 0, inner: 0 }); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${
              isAdding ? 'bg-gray-100 text-gray-600' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isAdding ? 'Back to List' : <><Plus size={18} /> Add Stock Feed</>}
          </button>
        )}
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <span className="font-bold">{message.text}</span>
        </div>
      )}

      {isAdding ? (
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Layers className="text-blue-600" size={20} />
                {editingId ? 'Edit Paper Stock' : 'Feed New Stock Entry'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="mb-4">
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 pl-1 tracking-widest">Paper Source</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, paperSource: 'Company paper'})}
                    className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 transition-all font-bold uppercase tracking-wider text-xs ${
                      formData.paperSource === 'Company paper'
                        ? 'border-blue-600 bg-blue-50/30 text-blue-700 shadow-sm'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    🏢 Company Paper
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, paperSource: 'Party paper'})}
                    className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 transition-all font-bold uppercase tracking-wider text-xs ${
                      formData.paperSource === 'Party paper'
                        ? 'border-blue-600 bg-blue-50/30 text-blue-700 shadow-sm'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    🎉 Party Paper
                  </button>
                </div>
              </div>
              <div className="w-full mb-6">
                <div className="bg-sky-50/30 p-5 sm:p-6 rounded-2xl border border-sky-100/50">
                  <h3 className="text-xs font-black text-sky-700 uppercase tracking-wider flex items-center gap-2 mb-6">
                    <span className="w-1.5 h-3 bg-sky-500 rounded-full" />
                    Paper Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 pl-1 tracking-widest">Party Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. ABC Traders"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                      value={formData.coverPartyName}
                      onChange={(e) => setFormData({...formData, coverPartyName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 pl-1 tracking-widest">Paper Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Art Card, Glossy"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                      value={formData.coverName}
                      onChange={(e) => setFormData({...formData, coverName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 pl-1 tracking-widest">Paper Supplier</label>
                    <input
                      type="text"
                      placeholder="e.g. Supplier name"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                      value={formData.coverSupplier}
                      onChange={(e) => setFormData({...formData, coverSupplier: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 pl-1 tracking-widest">Paper GSM</label>
                    <input 
                      type="number"
                      placeholder="e.g. 350, 300"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                      value={formData.coverGSM}
                      onChange={(e) => setFormData({...formData, coverGSM: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 pl-1 tracking-widest">
                      {editingId ? 'Add More Sheets' : 'Initial Sheet Count'}
                    </label>
                    {editingId && (
                      <p className="text-xs font-bold text-sky-700 mb-2 px-1">
                        Current remaining: {currentStock.cover.toLocaleString()} sheets
                        {formData.coverQuantity ? (
                          <span className="text-emerald-700"> → New total: {(currentStock.cover + Number(formData.coverQuantity || 0)).toLocaleString()} sheets</span>
                        ) : null}
                      </p>
                    )}
                    <input 
                      type="number"
                      min="0"
                      placeholder={editingId ? 'e.g. 4000 to add more stock' : 'e.g. 2000, 5000'}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                      value={formData.coverQuantity}
                      onChange={(e) => setFormData({...formData, coverQuantity: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 pl-1 tracking-widest">Paper Size</label>
                    <input 
                      type="text"
                      placeholder="e.g. 12x18, 13x19"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                      value={formData.coverPaperSize}
                      onChange={(e) => setFormData({...formData, coverPaperSize: e.target.value})}
                    />
                  </div>
                  </div>
                  <div className="mt-5 pt-5 border-t border-sky-100/50">
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 pl-1 tracking-widest">Low Stock Alert (Value)</label>
                    <input 
                      type="number" required
                      placeholder="Alert when below..."
                      className="w-full max-w-sm px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                      value={formData.lowStockThreshold}
                      onChange={(e) => setFormData({...formData, lowStockThreshold: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 pl-1 tracking-widest">Description / Best Use</label>
                <textarea 
                  rows="3"
                  placeholder="Notes for the team..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3">
                  <CheckCircle2 size={20} />
                  {editingId ? 'Add Stock & Save' : 'Save To Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* GSM Guide Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {gsmGuide.map((item, idx) => (
              <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Info size={14} />
                  </div>
                </div>
                <h3 className="font-black text-gray-900 uppercase text-xs tracking-wider">{item.type}</h3>
                <p className="text-xl font-black text-blue-600 mt-1">{item.gsm}</p>
                <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-tighter">{item.paper}</p>
              </div>
            ))}
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-gray-100 mb-6 bg-white p-2 rounded-2xl shadow-sm gap-2">
            <button
              onClick={() => setActiveTab('Company paper')}
              className={`flex-1 flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'Company paper'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              🏢 Company Paper
              <span className={`px-2 py-0.5 text-xs font-black rounded-md ${
                activeTab === 'Company paper' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {stock.filter(item => (item.paperSource || 'Company paper') === 'Company paper').length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('Party paper')}
              className={`flex-1 flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'Party paper'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              🎉 Party Paper
              <span className={`px-2 py-0.5 text-xs font-black rounded-md ${
                activeTab === 'Party paper' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {stock.filter(item => (item.paperSource || 'Company paper') === 'Party paper').length}
              </span>
            </button>
          </div>

          {/* Stock Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 underline decoration-blue-500 decoration-4 underline-offset-8">
                Current Inventory
              </h2>
              <div className="relative w-full sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search stock..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-full text-xs outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="overflow-x-auto min-h-100">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                    <th className="px-6 py-4">Paper Name & GSM</th>
                    <th className="px-6 py-4">Remaining Stock</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Updated</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan="5" className="px-6 py-20 text-center text-gray-400 font-bold animate-pulse uppercase tracking-[0.2em]">Loading Inventory...</td></tr>
                  ) : stock.filter(item => {
                    const matchesTab = (item.paperSource || 'Company paper') === activeTab;
                    const matchesSearch = (item.coverName || item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (item.innerName || item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (item.coverPartyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (item.innerPartyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (item.coverSupplier || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (item.innerSupplier || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (item.gsm && item.gsm.toString().includes(searchQuery)) ||
                                            (item.coverGSM && item.coverGSM.toString().includes(searchQuery)) ||
                                            (item.innerGSM && item.innerGSM.toString().includes(searchQuery)) ||
                                            (item.coverPaperSize && item.coverPaperSize.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                            (item.innerPaperSize && item.innerPaperSize.toLowerCase().includes(searchQuery.toLowerCase()));
                    return matchesTab && matchesSearch;
                  }).length === 0 ? (
                    <tr><td colSpan="5" className="px-6 py-20 text-center text-gray-400 italic">No inventory records found for {activeTab === 'Company paper' ? 'Company Paper' : 'Party Paper'}.</td></tr>
                  ) : (
                    stock.filter(item => {
                      const matchesTab = (item.paperSource || 'Company paper') === activeTab;
                      const matchesSearch = (item.coverName || item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (item.innerName || item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (item.coverPartyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (item.innerPartyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (item.coverSupplier || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (item.innerSupplier || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (item.gsm && item.gsm.toString().includes(searchQuery)) ||
                                            (item.coverGSM && item.coverGSM.toString().includes(searchQuery)) ||
                                            (item.innerGSM && item.innerGSM.toString().includes(searchQuery)) ||
                                            (item.coverPaperSize && item.coverPaperSize.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                            (item.innerPaperSize && item.innerPaperSize.toLowerCase().includes(searchQuery.toLowerCase()));
                      return matchesTab && matchesSearch;
                    }).map((item) => {
                      const isLow = ((item.coverQuantity !== undefined ? item.coverQuantity : item.quantity) <= item.lowStockThreshold || 
                                     (item.innerGSM && (item.innerQuantity || 0) <= item.lowStockThreshold));
                      return (
                        <tr key={item._id} className="hover:bg-blue-50/10 transition-colors group">
                          <td className="px-6 py-5">
                             <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-gray-100 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                   <Layers size={18} />
                                </div>
                                <div>
                                   <p className="font-black text-gray-950 group-hover:text-blue-600 transition-colors uppercase text-sm">
                                     {item.coverName || item.name || '--'}
                                   </p>
                                   <div className="flex items-center gap-2 mt-1.5 text-[10px] font-bold">
                                     {(item.coverGSM !== undefined || item.gsm) ? (
                                       <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-100">
                                         Paper: {item.coverPartyName ? `${item.coverPartyName} · ` : ''}{item.coverName || item.name || '--'}{item.coverSupplier ? ` · Supplier: ${item.coverSupplier}` : ''} · {item.coverGSM !== undefined ? item.coverGSM : item.gsm} GSM{item.coverPaperSize ? ` · ${item.coverPaperSize}` : ''}
                                       </span>
                                     ) : (
                                       <span className="bg-gray-50 text-gray-400 px-2 py-0.5 rounded border border-gray-200">Paper: --</span>
                                     )}
                                   </div>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-5">
                             <div className="space-y-1.5">
                               {(item.coverGSM !== undefined || item.gsm) && (
                                 <div className="flex items-center gap-2">
                                   <span className="text-[10px] font-black text-gray-400 uppercase w-12">Paper:</span>
                                   <span className={`text-sm font-black tracking-tight ${(item.coverQuantity !== undefined ? item.coverQuantity : item.quantity) <= item.lowStockThreshold ? 'text-red-600' : 'text-gray-900'}`}>
                                     {(item.coverQuantity !== undefined ? item.coverQuantity : item.quantity).toLocaleString()} Sheets
                                   </span>
                                 </div>
                               )}
                             </div>
                             {item.description && <p className="text-[9px] text-gray-400 font-medium italic mt-1.5">{item.description}</p>}
                          </td>
                          <td className="px-6 py-5">
                             {isLow ? (
                               <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase ring-1 ring-red-100 w-fit animate-pulse">
                                 <AlertTriangle size={12} /> Low Stock
                               </span>
                             ) : (
                               <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase ring-1 ring-emerald-100 w-fit">
                                 <CheckCircle2 size={12} /> In Stock
                               </span>
                             )}
                          </td>
                          <td className="px-6 py-5 text-xs font-bold text-gray-400 uppercase">
                             {new Date(item.updatedAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-5">
                             
                              <ActionButtons
                                recordId={item._id}
                                onRowView={() => setViewingStock(item)}
                                onRowAdd={() => {
                                  setAddingStockToItem(item);
                                  setAddStockForm({ coverQuantity: '', innerQuantity: '', challanNo: '', invoiceNo: '', date: new Date().toISOString().split('T')[0] });
                                }}
                                onRowEdit={() => handleEdit(item)}
                                onRowDelete={() => handleDelete(item._id)}
                                canEdit={hasPermission('paperStock', 'edit')}
                                canDelete={hasPermission('paperStock', 'delete')}
                              />

                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    
      {viewingStock && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-start p-6 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Stock Add History</h3>
                <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">{viewingStock.coverName || viewingStock.innerName}</p>
              </div>
              <button 
                onClick={() => setViewingStock(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="overflow-auto flex-1 p-0">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Party Name</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Paper Name</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Challan No.</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice No.</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Qty Added</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loadingHistory ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-slate-400 font-bold animate-pulse uppercase tracking-widest">
                        Loading History...
                      </td>
                    </tr>
                  ) : stockHistory.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-slate-400 font-medium italic">
                        No add history found for this stock.
                      </td>
                    </tr>
                  ) : (
                    stockHistory.map((item, idx) => {
                      const d = new Date(item.createdAt);
                      return (
                        <tr key={item._id || idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-bold text-slate-700">{d.toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-500">{d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-sky-50 text-sky-700 text-[10px] font-black uppercase rounded-md tracking-wider">
                              {item.paperType || 'PAPER'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.partyName || '—'}</td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-600">{item.paperName || '—'}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.challanNo || '—'}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.invoiceNo || '—'}</td>
                          <td className="px-6 py-4 text-sm font-black text-emerald-600 text-right">
                            +{item.quantity?.toLocaleString()} Sheets
                          </td>
                          <td className="px-6 py-4 text-center">
                             <button className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                               <Trash2 size={16} />
                             </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {addingStockToItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start p-6 border-b border-sky-50 bg-sky-50/30">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Add Stock</h3>
                <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">{addingStockToItem.coverName || addingStockToItem.innerName}</p>
              </div>
              <button onClick={() => setAddingStockToItem(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="p-6 space-y-6">
              {addingStockToItem.coverName && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-2">Paper Name & GSM (Cover)</h4>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-black text-sky-700">Cover</span>
                    <span className="font-medium text-slate-600">
                      {[addingStockToItem.coverPartyName, addingStockToItem.coverName, addingStockToItem.coverGSM ? addingStockToItem.coverGSM + ' GSM' : '', addingStockToItem.coverPaperSize].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <div>
                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Remaining Stock</h4>
                      <p className="font-black text-slate-800">Cover: {(addingStockToItem.coverQuantity || 0).toLocaleString()} Sheets</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Last Updated</h4>
                      <p className="font-bold text-slate-800">{new Date(addingStockToItem.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 mt-4">Add Cover Sheets</label>
                     <input type="number" placeholder="e.g. 5000" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-semibold outline-none transition-all" value={addStockForm.coverQuantity} onChange={e => setAddStockForm({...addStockForm, coverQuantity: e.target.value})} />
                  </div>
                </div>
              )}

              {addingStockToItem.innerName && (
                <div className="space-y-4 border-t border-slate-100 pt-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-2">Paper Name & GSM (Inner)</h4>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-black text-sky-700">Inner</span>
                    <span className="font-medium text-slate-600">
                      {[addingStockToItem.innerPartyName, addingStockToItem.innerName, addingStockToItem.innerGSM ? addingStockToItem.innerGSM + ' GSM' : '', addingStockToItem.innerPaperSize].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <div>
                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Remaining Stock</h4>
                      <p className="font-black text-slate-800">Inner: {(addingStockToItem.innerQuantity || 0).toLocaleString()} Sheets</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Last Updated</h4>
                      <p className="font-bold text-slate-800">{new Date(addingStockToItem.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 mt-4">Add Inner Sheets</label>
                     <input type="number" placeholder="e.g. 5000" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-semibold outline-none transition-all" value={addStockForm.innerQuantity} onChange={e => setAddStockForm({...addStockForm, innerQuantity: e.target.value})} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Challan No.</label>
                  <input type="text" placeholder="Optional" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-sky-500" value={addStockForm.challanNo} onChange={e => setAddStockForm({...addStockForm, challanNo: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Invoice No.</label>
                  <input type="text" placeholder="Optional" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-sky-500" value={addStockForm.invoiceNo} onChange={e => setAddStockForm({...addStockForm, invoiceNo: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Date</label>
                  <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-sky-500" value={addStockForm.date} onChange={e => setAddStockForm({...addStockForm, date: e.target.value})} />
                </div>
              </div>

              <button type="submit" className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                <Plus size={18} /> Add To Stock
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaperStockManagement;
