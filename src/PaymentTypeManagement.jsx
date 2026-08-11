import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import { API_BASE_URL } from './utils/apiBase';
import { hasPermission } from './utils/permissions';

const PaymentTypeManagement = () => {
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = () => {
    fetch(`${API_BASE_URL}/api/payment-type`)
      .then(res => res.json())
      .then(data => setPaymentTypes(data))
      .catch(err => console.error("Error fetching Payment Types:", err));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const url = editingId
        ? `${API_BASE_URL}/api/payment-type/${editingId}`
        : `${API_BASE_URL}/api/payment-type`;
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });

      if (response.ok) {
        fetchPayments();
        setEditingId(null);
        setName('');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (err) {
      console.error("Error saving payment type:", err);
      alert("Failed to save. Is server running?");
    }
  };

  const handleEdit = (pt) => {
    setName(pt.name);
    setEditingId(pt._id);
  };

  const handleDelete = (id) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/payment-type/${deletingId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          fetchPayments();
          setIsDeleteModalOpen(false);
          setDeletingId(null);
        }
      } catch (err) {
        console.error("Error deleting payment type:", err);
      }
    }
  };

  return (
    <div className="w-full px-4 mt-8 pb-12 text-gray-800 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 group flex items-center gap-3">
            <div className="bg-blue-600 w-1.5 h-6 rounded-full" />
            Manage Payment Type
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1 font-medium italic">Add and listing your payment types</p>
        </div>
        <div className="text-sm text-gray-500 font-medium">
          Payment &gt; <span className="text-blue-600">Payment Types</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Add Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-24 transition-all">
            <div className="p-6 border-b border-gray-50">
              <h2 className="text-lg font-bold text-gray-800">
                {editingId ? 'Update Payment Type' : 'Add New Payment Type'}
              </h2>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Name/Title: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter payment type name"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                />
                <p className="text-[10px] text-gray-400 font-medium italic">
                  This name is appears on your site
                </p>
              </div>
              {hasPermission('payments', editingId ? 'edit' : 'create') && (
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-[#3b4180] hover:bg-[#2d3264] text-white py-3 rounded-lg font-bold shadow-md transition-all active:scale-95 shadow-indigo-100"
                >
                  {editingId ? 'Update' : 'Save'}
                </button>
              )}
              {editingId && (
                <button
                  type="button"
                  onClick={() => { setEditingId(null); setName(''); }}
                  className="w-full text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel Edit
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Right Side: Listing Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all">
            <div className="p-6 border-b border-gray-50">
              <h2 className="text-lg font-bold text-gray-800">Payment Type Listings</h2>
            </div>
            <div className="overflow-x-auto min-h-75">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 uppercase text-[11px] font-bold tracking-wider">
                    <th className="px-6 py-4 w-20">S.No.</th>
                    <th className="px-6 py-4">Payment Name</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paymentTypes.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-6 py-20 text-center text-gray-400 italic">
                        No payment types added yet.
                      </td>
                    </tr>
                  ) : (
                    paymentTypes.map((pt, index) => (
                      <tr key={pt._id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4 text-sm font-medium text-gray-500">{index + 1}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-800">{pt.name}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center items-center gap-4">
                            {hasPermission('payments', 'edit') && (
                              <button
                                onClick={() => handleEdit(pt)}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                            )}
                            {hasPermission('payments', 'delete') && (
                              <button
                                onClick={() => handleDelete(pt._id)}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Showing {paymentTypes.length > 0 ? `1 to ${paymentTypes.length}` : '0'} of {paymentTypes.length} entries
              </p>
            </div>
          </div>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Are you sure?"
        message="Are you sure you want to delete this payment method?"
      />
    </div>
  );
};

export default PaymentTypeManagement;
