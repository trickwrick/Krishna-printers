import React, { useState, useEffect } from 'react';
import { Layers, Plus, Search, AlertTriangle, Edit2, Trash2, CheckCircle2, Info, ArrowUpRight } from 'lucide-react';
import { mergePaperSizes, rememberPaperSizes } from './utils/paperStockSizes';
import { API_BASE_URL } from './utils/apiBase';

const buildStockName = (coverName, innerName) => {
  const cover = (coverName || '').trim();
  const inner = (innerName || '').trim();
  if (cover && inner && cover !== inner) return `${cover} / ${inner}`;
  return cover || inner || '';
};

const PaperStockManagement = () => {
  const [stock, setStock] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentStock, setCurrentStock] = useState({ cover: 0, inner: 0 });
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    coverPartyName: '',
    coverName: '',
    innerPartyName: '',
    innerName: '',
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
          innerPartyName: '',
          innerName: '',
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

  const handleEdit = (item) => {
    setCurrentStock({
      cover: item.coverQuantity !== undefined ? Number(item.coverQuantity) : Number(item.quantity || 0),
      inner: Number(item.innerQuantity || 0),
    });
    setFormData({
      coverPartyName: item.coverPartyName || '',
      coverName: item.coverName || item.name || '',
      innerPartyName: item.innerPartyName || '',
      innerName: item.innerName || item.name || '',
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

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this paper stock?")) return;
    try {
      await fetch(`${API_BASE_URL}/api/paper-stock/${id}`, { method: 'DELETE' });
      fetchStock();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="w-full px-4 mt-8 pb-12 text-gray-800 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <div className="bg-blue-600 w-2 h-8 rounded-full" />
            Paper Stock Management
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium italic">Track inventory and auto-deduct sheets from Job Cards.</p>
        </div>
        <button
          onClick={() => { setIsAdding(!isAdding); setEditingId(null); setCurrentStock({ cover: 0, inner: 0 }); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${
            isAdding ? 'bg-gray-100 text-gray-600' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isAdding ? 'Back to List' : <><Plus size={18} /> Add Stock Feed</>}
        </button>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cover Paper Section */}
                <div className="bg-sky-50/30 p-5 rounded-2xl border border-sky-100/50 space-y-4">
                  <h3 className="text-xs font-black text-sky-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-sky-500 rounded-full" />
                    Cover Paper
                  </h3>
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
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 pl-1 tracking-widest">Cover GSM</label>
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
                      {editingId ? 'Add More Cover Sheets' : 'Cover Initial Sheet Count'}
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
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 pl-1 tracking-widest">Cover Paper Size</label>
                    <input 
                      type="text"
                      placeholder="e.g. 12x18, 13x19"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                      value={formData.coverPaperSize}
                      onChange={(e) => setFormData({...formData, coverPaperSize: e.target.value})}
                    />
                  </div>
                </div>

                {/* Inner Paper Section */}
                <div className="bg-indigo-50/30 p-5 rounded-2xl border border-indigo-100/50 space-y-4">
                  <h3 className="text-xs font-black text-indigo-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-indigo-500 rounded-full" />
                    Inner Paper
                  </h3>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 pl-1 tracking-widest">Party Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. XYZ Publications"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                      value={formData.innerPartyName}
                      onChange={(e) => setFormData({...formData, innerPartyName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 pl-1 tracking-widest">Paper Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Offset, Maplitho"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                      value={formData.innerName}
                      onChange={(e) => setFormData({...formData, innerName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 pl-1 tracking-widest">Inner GSM</label>
                    <input 
                      type="number"
                      placeholder="e.g. 90, 70"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                      value={formData.innerGSM}
                      onChange={(e) => setFormData({...formData, innerGSM: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 pl-1 tracking-widest">
                      {editingId ? 'Add More Inner Sheets' : 'Inner Initial Sheet Count'}
                    </label>
                    {editingId && (
                      <p className="text-xs font-bold text-indigo-700 mb-2 px-1">
                        Current remaining: {currentStock.inner.toLocaleString()} sheets
                        {formData.innerQuantity ? (
                          <span className="text-emerald-700"> → New total: {(currentStock.inner + Number(formData.innerQuantity || 0)).toLocaleString()} sheets</span>
                        ) : null}
                      </p>
                    )}
                    <input 
                      type="number"
                      min="0"
                      placeholder={editingId ? 'e.g. 4000 to add more stock' : 'e.g. 5000, 10000'}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                      value={formData.innerQuantity}
                      onChange={(e) => setFormData({...formData, innerQuantity: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 pl-1 tracking-widest">Inner Paper Size</label>
                    <input 
                      type="text"
                      placeholder="e.g. 18x23, 23x36"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                      value={formData.innerPaperSize}
                      onChange={(e) => setFormData({...formData, innerPaperSize: e.target.value})}
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 pl-1 tracking-widest">Low Stock Alert (Value)</label>
                  <input 
                    type="number" required
                    placeholder="Alert when below..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({...formData, lowStockThreshold: e.target.value})}
                  />
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
                                     {(item.coverName || item.name) === (item.innerName || item.name)
                                       ? (item.coverName || item.name)
                                       : `${item.coverName || item.name || '--'} / ${item.innerName || '--'}`}
                                   </p>
                                   <div className="flex items-center gap-2 mt-1.5 text-[10px] font-bold">
                                     {(item.coverGSM !== undefined || item.gsm) ? (
                                       <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-100">
                                         Cover: {item.coverPartyName ? `${item.coverPartyName} · ` : ''}{item.coverName || item.name || '--'} · {item.coverGSM !== undefined ? item.coverGSM : item.gsm} GSM{item.coverPaperSize ? ` · ${item.coverPaperSize}` : ''}
                                       </span>
                                     ) : (
                                       <span className="bg-gray-50 text-gray-400 px-2 py-0.5 rounded border border-gray-200">Cover: --</span>
                                     )}
                                     {item.innerGSM ? (
                                       <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                                         Inner: {item.innerPartyName ? `${item.innerPartyName} · ` : ''}{item.innerName || item.name || '--'} · {item.innerGSM} GSM{item.innerPaperSize ? ` · ${item.innerPaperSize}` : ''}
                                       </span>
                                     ) : (
                                       <span className="bg-gray-50 text-gray-400 px-2 py-0.5 rounded border border-gray-200">Inner: --</span>
                                     )}
                                   </div>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-5">
                             <div className="space-y-1.5">
                               {(item.coverGSM !== undefined || item.gsm) && (
                                 <div className="flex items-center gap-2">
                                   <span className="text-[10px] font-black text-gray-400 uppercase w-12">Cover:</span>
                                   <span className={`text-sm font-black tracking-tight ${(item.coverQuantity !== undefined ? item.coverQuantity : item.quantity) <= item.lowStockThreshold ? 'text-red-600' : 'text-gray-900'}`}>
                                     {(item.coverQuantity !== undefined ? item.coverQuantity : item.quantity).toLocaleString()} Sheets
                                   </span>
                                 </div>
                               )}
                               <div className="flex items-center gap-2">
                                 <span className="text-[10px] font-black text-gray-400 uppercase w-12">Inner:</span>
                                 {item.innerGSM ? (
                                   <span className={`text-sm font-black tracking-tight ${(item.innerQuantity || 0) <= item.lowStockThreshold ? 'text-red-600' : 'text-gray-900'}`}>
                                     {(item.innerQuantity || 0).toLocaleString()} Sheets
                                   </span>
                                 ) : (
                                   <span className="text-xs font-bold text-gray-400 italic">Not set</span>
                                 )}
                               </div>
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
                             <div className="flex justify-center gap-2">
                                <button 
                                  onClick={() => handleEdit(item)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDelete(item._id)}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                             </div>
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
    </div>
  );
};

export default PaperStockManagement;
