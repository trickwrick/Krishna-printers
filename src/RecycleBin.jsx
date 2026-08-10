import React, { useState, useEffect } from 'react';
import { Trash2, RefreshCw, Undo2 } from 'lucide-react';
import { API_BASE_URL } from './utils/apiBase';

const RecycleBin = () => {
  const [deletedJobs, setDeletedJobs] = useState([]);
  const [deletedInvoices, setDeletedInvoices] = useState([]);
  const [deletedChallans, setDeletedChallans] = useState([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);

  useEffect(() => {
    fetchDeletedItems();
  }, []);

  const fetchDeletedItems = async () => {
    setLoadingDeleted(true);
    try {
      const [jobsRes, invRes, challanRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/jobcard/deleted/all`),
        fetch(`${API_BASE_URL}/api/invoice/deleted/all`),
        fetch(`${API_BASE_URL}/api/challan/deleted/all`)
      ]);
      if (jobsRes.ok) {
        setDeletedJobs(await jobsRes.json());
      }
      if (invRes.ok) {
        setDeletedInvoices(await invRes.json());
      }
      if (challanRes.ok) {
        setDeletedChallans(await challanRes.json());
      }
    } catch (e) {
      console.error("Failed to fetch deleted items:", e);
    }
    setLoadingDeleted(false);
  };

  const restoreJob = async (id) => {
    if (!window.confirm("Restore this Job Card?")) return;
    try {
      await fetch(`${API_BASE_URL}/api/jobcard/${id}/restore`, { method: 'PUT' });
      fetchDeletedItems();
    } catch (e) {
      console.error(e);
    }
  };

  const restoreInvoice = async (id) => {
    if (!window.confirm("Restore this Invoice?")) return;
    try {
      await fetch(`${API_BASE_URL}/api/invoice/${id}/restore`, { method: 'PUT' });
      fetchDeletedItems();
    } catch (e) {
      console.error(e);
    }
  };

  const restoreChallan = async (id) => {
    if (!window.confirm("Restore this Challan?")) return;
    try {
      await fetch(`${API_BASE_URL}/api/challan/${id}/restore`, { method: 'PUT' });
      fetchDeletedItems();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="mx-auto mt-8 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="bg-blue-600 w-1.5 h-6 rounded-full" />
            Recycle Bin
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1 font-medium italic">Manage and restore deleted items</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-rose-100 p-2 rounded-lg text-rose-600">
              <Trash2 size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Recycle Bin</h2>
          </div>
          <button 
            onClick={fetchDeletedItems} 
            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors focus:outline-none"
          >
            <RefreshCw size={16} className={loadingDeleted ? "animate-spin text-blue-500" : ""} />
            Refresh
          </button>
        </div>
        
        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* Deleted Job Cards */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-700 flex items-center gap-2 border-b border-gray-100 pb-3">
              <div className="w-1.5 h-4 rounded-full bg-blue-500" /> 
              Deleted Job Cards
              <span className="ml-auto bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">{deletedJobs.length}</span>
            </h3>
            {deletedJobs.length === 0 ? (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-6 text-center">
                <p className="text-sm text-gray-400 font-medium">No deleted job cards found.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-100 overflow-y-auto pr-2 custom-scrollbar">
                {deletedJobs.map(job => (
                  <div key={job._id} className="flex items-center justify-between p-4 bg-white border border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-md rounded-xl transition-all group">
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="text-sm font-bold text-gray-800 truncate">
                        <span className="text-xs text-blue-600 mr-2">#{job.jobNumber}</span>
                        {job.partyName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Deleted: {job.deletedAt ? new Date(job.deletedAt).toLocaleString() : 'Unknown Date'}
                      </p>
                    </div>
                    <button 
                      onClick={() => restoreJob(job._id)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-100 rounded-lg text-xs font-bold transition-all"
                    >
                      <Undo2 size={14} /> Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deleted Challans */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-700 flex items-center gap-2 border-b border-gray-100 pb-3">
              <div className="w-1.5 h-4 rounded-full bg-amber-500" /> 
              Deleted Challans
              <span className="ml-auto bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">{deletedChallans.length}</span>
            </h3>
            {deletedChallans.length === 0 ? (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-6 text-center">
                <p className="text-sm text-gray-400 font-medium">No deleted challans found.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-100 overflow-y-auto pr-2 custom-scrollbar">
                {deletedChallans.map(ch => (
                  <div key={ch._id} className="flex items-center justify-between p-4 bg-white border border-gray-100 hover:border-amber-200 shadow-sm hover:shadow-md rounded-xl transition-all group">
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="text-sm font-bold text-gray-800 truncate">
                        <span className="text-xs text-amber-600 mr-2">#{ch.challanNo}</span>
                        {ch.partyName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Deleted: {ch.deletedAt ? new Date(ch.deletedAt).toLocaleString() : 'Unknown Date'}
                      </p>
                    </div>
                    <button 
                      onClick={() => restoreChallan(ch._id)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-100 rounded-lg text-xs font-bold transition-all"
                    >
                      <Undo2 size={14} /> Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default RecycleBin;
