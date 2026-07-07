import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Package } from 'lucide-react';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import { API_BASE_URL } from './utils/apiBase';

const EMPTY_FORM = {
  name: '',
  hsn: '',
  rate: '',
  per: 'PCS',
  gstPercent: '18',
  note: '',
};

const ItemListManagement = () => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/items`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching items:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Item name is required');
      return;
    }

    setIsSaving(true);
    try {
      const url = editingId
        ? `${API_BASE_URL}/api/items/${editingId}`
        : `${API_BASE_URL}/api/items`;
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          hsn: form.hsn.trim(),
          rate: Number(form.rate) || 0,
          per: form.per.trim() || 'PCS',
          gstPercent: Number(form.gstPercent) || 18,
          note: form.note.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save item');
      }

      await fetchItems();
      resetForm();
    } catch (err) {
      console.error('Error saving item:', err);
      alert(err.message || 'Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.name || '',
      hsn: item.hsn || '',
      rate: item.rate ?? '',
      per: item.per ?? '',
      gstPercent: String(item.gstPercent ?? 18),
      note: item.note || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/items/${deletingId}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchItems();
        if (editingId === deletingId) resetForm();
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    } finally {
      setIsDeleteModalOpen(false);
      setDeletingId(null);
    }
  };

  const query = search.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    if (!query) return true;
    return (
      item.name?.toLowerCase().includes(query)
      || item.hsn?.toLowerCase().includes(query)
      || item.per?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="w-full px-4 mt-8 pb-12 text-gray-800 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 group flex items-center gap-3">
            <div className="bg-blue-600 w-1.5 h-6 rounded-full" />
            Manage Item List
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1 font-medium italic">
            Save items once — use in invoice &amp; challan
          </p>
        </div>
        <div className="text-sm text-gray-500 font-medium">
          More &gt; <span className="text-blue-600">Item List</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
            <div className="bg-blue-900 text-white px-5 py-2 w-fit relative font-semibold text-xs sm:text-sm rounded-br-2xl">
              {editingId ? 'Update Item' : 'Add Item'}
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                  Item Name (Description) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Visiting Card, Brochure"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">HSN/SAC</label>
                <input
                  type="text"
                  name="hsn"
                  value={form.hsn}
                  onChange={handleChange}
                  placeholder="HSN code"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Default Rate</label>
                  <input
                    type="number"
                    name="rate"
                    min="0"
                    step="any"
                    value={form.rate}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">per</label>
                  <input
                    type="text"
                    name="per"
                    value={form.per}
                    onChange={handleChange}
                    placeholder="PCS"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">GST %</label>
                <input
                  type="number"
                  name="gstPercent"
                  min="0"
                  step="any"
                  value={form.gstPercent}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Note</label>
                <textarea
                  name="note"
                  value={form.note}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Optional note"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-blue-800 hover:bg-blue-900 disabled:opacity-60 text-white py-3 rounded-lg font-bold shadow-md transition-all active:scale-95"
              >
                {isSaving ? 'Saving...' : (editingId ? 'Update Item' : 'Save Item')}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  Cancel Edit
                </button>
              )}
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Package size={20} className="text-blue-600" />
                Item Listings
              </h2>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search item, HSN, unit..."
                className="w-full sm:w-64 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 uppercase text-[11px] font-bold tracking-wider">
                    <th className="px-4 py-3 w-14">S.No.</th>
                    <th className="px-4 py-3">Item Name (Description)</th>
                    <th className="px-4 py-3">HSN/SAC</th>
                    <th className="px-4 py-3 text-right">Rate</th>
                    <th className="px-4 py-3 text-center">per</th>
                    <th className="px-4 py-3 text-center">GST %</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-20 text-center text-gray-400 italic">
                        {items.length === 0 ? 'No items added yet.' : 'No items match your search.'}
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, index) => (
                      <tr key={item._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                          {item.note && (
                            <p className="text-[11px] text-gray-400 truncate max-w-[200px]">{item.note}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.hsn || '—'}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-800">
                          ₹ {Number(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-center uppercase text-gray-700">{item.per || 'PCS'}</td>
                        <td className="px-4 py-3 text-sm text-center text-gray-700">{item.gstPercent ?? 18}%</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item._id)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Showing {filteredItems.length} of {items.length} items
              </p>
            </div>
          </div>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete item?"
        message="Are you sure you want to delete this item from the list?"
      />
    </div>
  );
};

export default ItemListManagement;
