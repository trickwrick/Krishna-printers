import React, { useState, useEffect } from 'react';
import { Database, Plus, Search, AlertTriangle, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from './utils/apiBase';
import { hasPermission } from './utils/permissions';

const PlateStockManagement = () => {
  const [stock, setStock] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentQuantity, setCurrentQuantity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    plateName: '',
    supplier: '',
    size: '',
    quantity: '',
    description: '',
    lowStockThreshold: 50,
    plateSource: 'Company plate'
  });

  const [activeTab, setActiveTab] = useState('Company plate');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/plate-stock`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setStock(data);
      } else {
        console.error("API returned non-array:", data);
        setStock([]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setStock([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.plateName.trim()) {
      setMessage({ type: 'error', text: 'Enter a Plate Name.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const url = editingId 
      ? `${API_BASE_URL}/api/plate-stock/${editingId}`
      : `${API_BASE_URL}/api/plate-stock`;
    
    const method = editingId ? 'PUT' : 'POST';

    const finalQuantity = editingId
      ? (Number(currentQuantity) || 0) + (Number(formData.quantity) || 0)
      : (Number(formData.quantity) || 0);

    const submissionData = {
      ...formData,
      quantity: finalQuantity
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: editingId ? 'Plate stock updated!' : 'Plate added to stock!' });
        setFormData({ 
          plateName: '',
          supplier: '',
          size: '',
          quantity: '',
          description: '', 
          lowStockThreshold: 50, 
          plateSource: 'Company plate' 
        });
        setIsAdding(false);
        setEditingId(null);
        setCurrentQuantity(0);
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
    setCurrentQuantity(Number(item.quantity || 0));
    setFormData({
      plateName: item.plateName || '',
      supplier: item.supplier || '',
      size: item.size || '',
      quantity: '',
      description: item.description || '',
      lowStockThreshold: item.lowStockThreshold || 50,
      plateSource: item.plateSource || 'Company plate'
    });
    setEditingId(item._id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this plate stock?")) return;
    try {
      await fetch(`${API_BASE_URL}/api/plate-stock/${id}`, { method: 'DELETE' });
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
            Plate Stock Management
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium italic">Track inventory for Plates.</p>
        </div>
        {hasPermission('paperStock', 'create') && (
          <button
            onClick={() => { setIsAdding(!isAdding); setEditingId(null); setCurrentQuantity(0); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${
              isAdding ? 'bg-gray-100 text-gray-600' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isAdding ? 'Back to List' : <><Plus size={18} /> Add Plate Stock</>}
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
                <Database className="text-blue-600" size={20} />
                {editingId ? 'Edit Plate Stock' : 'Feed New Plate Entry'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="mb-4">
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 pl-1 tracking-widest">Plate Source</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, plateSource: 'Company plate'})}
                    className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 transition-all font-bold uppercase tracking-wider text-xs ${
                      formData.plateSource === 'Company plate'
                        ? 'border-blue-600 bg-blue-50/30 text-blue-700 shadow-sm'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    🏢 Company Plate
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, plateSource: 'Party plate'})}
                    className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 transition-all font-bold uppercase tracking-wider text-xs ${
                      formData.plateSource === 'Party plate'
                        ? 'border-blue-600 bg-blue-50/30 text-blue-700 shadow-sm'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    🎉 Party Plate
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 pl-1 tracking-widest">Plate Name</label>
                  <input 
                    type="text" required
                    placeholder="e.g. CTP Plate"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                    value={formData.plateName}
                    onChange={(e) => setFormData({...formData, plateName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 pl-1 tracking-widest">Supplier / Party</label>
                  <input
                    type="text"
                    placeholder="e.g. Supplier Name"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                    value={formData.supplier}
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 pl-1 tracking-widest">Plate Size</label>
                  <input 
                    type="text"
                    placeholder="e.g. 770x1030 mm"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                    value={formData.size}
                    onChange={(e) => setFormData({...formData, size: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 pl-1 tracking-widest">
                    {editingId ? 'Add More Plates' : 'Initial Plate Count'}
                  </label>
                  {editingId && (
                    <p className="text-xs font-bold text-sky-700 mb-2 px-1">
                      Current remaining: {currentQuantity.toLocaleString()} plates
                      {formData.quantity ? (
                        <span className="text-emerald-700"> → New total: {(currentQuantity + Number(formData.quantity || 0)).toLocaleString()} plates</span>
                      ) : null}
                    </p>
                  )}
                  <input 
                    type="number"
                    min="0"
                    placeholder={editingId ? 'e.g. 100 to add more plates' : 'e.g. 500'}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  />
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
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 pl-1 tracking-widest">Description / Notes</label>
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
          {/* Tab Selection */}
          <div className="flex border-b border-gray-100 mb-6 bg-white p-2 rounded-2xl shadow-sm gap-2">
            <button
              onClick={() => setActiveTab('Company plate')}
              className={`flex-1 flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'Company plate'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              🏢 Company Plate
              <span className={`px-2 py-0.5 text-xs font-black rounded-md ${
                activeTab === 'Company plate' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {stock.filter(item => (item.plateSource || 'Company plate') === 'Company plate').length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('Party plate')}
              className={`flex-1 flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'Party plate'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              🎉 Party Plate
              <span className={`px-2 py-0.5 text-xs font-black rounded-md ${
                activeTab === 'Party plate' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {stock.filter(item => (item.plateSource || 'Company plate') === 'Party plate').length}
              </span>
            </button>
          </div>

          {/* Stock Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 underline decoration-blue-500 decoration-4 underline-offset-8">
                Current Plate Inventory
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
                    <th className="px-6 py-4">Plate Name & Details</th>
                    <th className="px-6 py-4">Remaining Stock</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan="4" className="px-6 py-20 text-center text-gray-400 font-bold animate-pulse uppercase tracking-[0.2em]">Loading Inventory...</td></tr>
                  ) : stock.filter(item => {
                    const matchesTab = (item.plateSource || 'Company plate') === activeTab;
                    const matchesSearch = (item.plateName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                          (item.supplier || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                          (item.size || '').toLowerCase().includes(searchQuery.toLowerCase());
                    return matchesTab && matchesSearch;
                  }).length === 0 ? (
                    <tr><td colSpan="4" className="px-6 py-20 text-center text-gray-400 italic">No inventory records found for {activeTab}.</td></tr>
                  ) : (
                    stock.filter(item => {
                      const matchesTab = (item.plateSource || 'Company plate') === activeTab;
                      const matchesSearch = (item.plateName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (item.supplier || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (item.size || '').toLowerCase().includes(searchQuery.toLowerCase());
                      return matchesTab && matchesSearch;
                    }).map((item) => {
                      const isLow = (item.quantity <= item.lowStockThreshold);
                      return (
                        <tr key={item._id} className="hover:bg-blue-50/10 transition-colors group">
                          <td className="px-6 py-5">
                             <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-gray-100 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                   <Database size={18} />
                                </div>
                                <div>
                                   <p className="font-black text-gray-950 group-hover:text-blue-600 transition-colors uppercase text-sm">
                                     {item.plateName}
                                   </p>
                                   <div className="flex items-center gap-2 mt-1.5 text-[10px] font-bold">
                                     <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-100">
                                       {item.supplier ? `${item.supplier} · ` : ''}{item.size ? item.size : 'Size: N/A'}
                                     </span>
                                   </div>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-5">
                             <div className="flex items-center gap-2">
                               <span className={`text-sm font-black tracking-tight ${item.quantity <= item.lowStockThreshold ? 'text-red-600' : 'text-gray-900'}`}>
                                 {(item.quantity || 0).toLocaleString()} Plates
                               </span>
                             </div>
                             {item.description && <p className="text-[9px] text-gray-400 font-medium italic mt-1.5 truncate max-w-xs">{item.description}</p>}
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
                          <td className="px-6 py-5">
                             <div className="flex justify-center gap-2">
                                {hasPermission('paperStock', 'edit') && (
                                  <button 
                                    onClick={() => handleEdit(item)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                )}
                                {hasPermission('paperStock', 'delete') && (
                                  <button 
                                    onClick={() => handleDelete(item._id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
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

export default PlateStockManagement;
