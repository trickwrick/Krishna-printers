import React, { useMemo, useState, useEffect } from 'react';
import { format, isSameDay } from 'date-fns';
import { Eye, X, CheckCircle, Clock, User, FileText, Check, Activity, Layers, Printer, FileDigit, Users, AlertCircle, Hash, Droplets, PackageCheck } from 'lucide-react';

const WORKFLOW_STEPS = [
  { title: 'Design & Proof', desc: 'Artwork, design & client approval' },
  { title: 'Printing', desc: 'Plate making & print production' },
  { title: 'Binding & Finish', desc: 'Cutting, folding & binding' },
  { title: 'QC & Delivery', desc: 'Quality check, packing & dispatch' },
];

export default function DailyWorkReport({ jobCards }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [workflowProgress, setWorkflowProgress] = useState({});
  const [workflowHistory, setWorkflowHistory] = useState({});

  useEffect(() => {
    try {
      setWorkflowProgress(JSON.parse(localStorage.getItem('krishnaJobWorkflowProgress') || '{}'));
      setWorkflowHistory(JSON.parse(localStorage.getItem('krishnaJobWorkflowHistory') || '{}'));
    } catch (e) {
      console.error(e);
    }
  }, [modalOpen]); // Refresh on modal open

  // Sort job cards by date descending
  const sortedCards = useMemo(() => {
    return [...jobCards].sort((a, b) => new Date(b.jobDate || b.createdAt) - new Date(a.jobDate || a.createdAt));
  }, [jobCards]);

  const handleOpenModal = (job) => {
    setSelectedJob(job);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedJob(null);
  };

  return (
    <div className="space-y-8">
      {(() => {
        const cards = sortedCards;
        const total = cards.length;
        const completed = cards.filter(c => (c.status || 'pending') === 'completed').length;
        const pending = total - completed;

        // Calculate unique active users across all cards
        const activeUsersSet = new Set();
        cards.forEach(c => {
          const history = workflowHistory[c._id] || [];
          history.forEach(h => {
            if (h.user) activeUsersSet.add(h.user);
          });
        });
        const activeUsers = activeUsersSet.size;

        return (
          <section className="bg-transparent space-y-6">
            
            {/* Dashboard Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Activity size={100} />
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Work Activity Dashboard</h2>
                  <p className="text-sm text-gray-500 font-medium mt-1">Overall summary of all jobs</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                  <div className="bg-blue-50/80 px-4 py-3 rounded-xl border border-blue-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg shadow-sm">
                      {total}
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider opacity-80">Jobs Created</div>
                      <div className="text-sm font-medium text-blue-900">Total</div>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50/80 px-4 py-3 rounded-xl border border-amber-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-lg shadow-sm">
                      {pending}
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider opacity-80">In Progress</div>
                      <div className="text-sm font-medium text-amber-900">Pending</div>
                    </div>
                  </div>
                  
                  <div className="bg-emerald-50/80 px-4 py-3 rounded-xl border border-emerald-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg shadow-sm">
                      {completed}
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider opacity-80">Finished</div>
                      <div className="text-sm font-medium text-emerald-900">Done</div>
                    </div>
                  </div>

                  <div className="bg-purple-50/80 px-4 py-3 rounded-xl border border-purple-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg shadow-sm">
                      {activeUsers}
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider opacity-80">Team</div>
                      <div className="text-sm font-medium text-purple-900">Active</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity List - Line by Line */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 border-b border-gray-100 px-4 py-2.5 gap-x-4">
                <span>#</span>
                <span>Job / Party</span>
                <span>Date</span>
                <span>Qty</span>
                <span>Paper Usage</span>
                <span>Status</span>
              </div>
              <div className="divide-y divide-gray-50">
                {cards.map((c, idx) => {
                  const cardKey = c._id;
                  const history = workflowHistory[cardKey] || [];
                  const recentActivity = history.length > 0 ? history[history.length - 1] : null;
                  const currentProgress = workflowProgress[cardKey] || 0;
                  const progressPercent = (currentProgress / 4) * 100;
                  const statusColor = (c.status || 'pending') === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                    : (c.status || 'pending') === 'in-progress'
                      ? 'bg-blue-50 text-blue-700 ring-blue-100'
                      : (c.status || 'pending') === 'cancelled'
                        ? 'bg-red-50 text-red-700 ring-red-100'
                        : 'bg-amber-50 text-amber-700 ring-amber-100';

                  // Paper usage
                  const totalUnits = parseInt(c.jobQty) || 0;
                  const paperUsageData = (() => { try { return JSON.parse(localStorage.getItem(`krishnaJobPaperUsage_${cardKey}`) || '[]'); } catch { return []; } })();
                  const usedUnits = paperUsageData.reduce((acc, r) => acc + r.qty, 0);
                  const paperDone = totalUnits > 0 && usedUnits >= totalUnits;

                  return (
                    <div
                      key={cardKey}
                      className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-x-4 px-4 py-3 hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* Sr. No */}
                      <span className="text-xs font-black text-gray-400 w-5 text-center">{idx + 1}</span>

                      {/* Job / Party */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">#{c.jobNumber}</span>
                          <span className="text-sm font-bold text-gray-900 truncate">{c.jobName || '—'}</span>
                        </div>
                        <div className="text-xs text-gray-500 truncate">{c.partyName || '—'}</div>
                      </div>

                      {/* Date */}
                      <div className="text-xs font-semibold text-gray-600 whitespace-nowrap">
                        {format(new Date(c.jobDate || c.createdAt), 'MMM d, yyyy')}
                      </div>

                      {/* Qty */}
                      <div className="text-sm font-semibold text-gray-700 whitespace-nowrap">{c.jobQty || '—'}</div>

                      {/* Paper Usage */}
                      <div className="flex flex-col items-center gap-0.5 min-w-18">
                        {totalUnits > 0 ? (
                          <>
                            <div className="flex items-center gap-1">
                              <Droplets size={11} className={paperDone ? 'text-emerald-500' : 'text-sky-400'} />
                              <span className="text-[11px] font-bold text-gray-700">
                                {usedUnits.toLocaleString()}<span className="text-gray-400 font-normal">/{totalUnits.toLocaleString()}</span>
                              </span>
                            </div>
                            {paperDone ? (
                              <span className="text-[9px] font-black uppercase tracking-wide text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 rounded-full">Done</span>
                            ) : (
                              <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-1 bg-sky-400 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(100, (usedUnits / totalUnits) * 100)}%` }}
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] text-gray-300">—</span>
                        )}
                      </div>

                      {/* Workflow Progress Removed */}

                      {/* Status + Detail button */}
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ring-1 ${statusColor}`}>
                          {c.status || 'pending'}
                        </span>
                        <button
                          onClick={() => handleOpenModal(c)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="View Full Activity"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })()}

      {modalOpen && selectedJob && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white relative z-10 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-xl shadow-inner shadow-blue-400 flex items-center justify-center rotate-3">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 leading-tight tracking-tight">{selectedJob.jobName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold tracking-wide">
                      <Hash size={10} />
                      {selectedJob.jobNumber}
                    </span>
                    <span className="text-sm text-gray-500 font-medium">• {selectedJob.partyName}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={closeModal}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors focus:outline-none"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 flex flex-col lg:flex-row gap-8">
              
              {/* Left Column: Job Specs */}
              <div className="lg:w-1/3 space-y-4">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Layers size={16} className="text-indigo-500" />
                  Job Specifications
                </h4>
                
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <span className="text-sm text-gray-500 flex items-center gap-2"><FileDigit size={16} className="text-gray-400"/> Total Pages/Copies</span>
                    <span className="text-base font-black text-gray-900">{selectedJob.totalCopies || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <span className="text-sm text-gray-500 flex items-center gap-2"><Printer size={16} className="text-gray-400"/> Print Type</span>
                    <span className="text-sm font-bold text-gray-900">{selectedJob.printSheet || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <span className="text-sm text-gray-500">Paper Details</span>
                    <span className="text-sm font-bold text-gray-900 truncate max-w-37.5" title={selectedJob.coverPaperDetails}>{selectedJob.coverPaperDetails || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center pb-1">
                    <span className="text-sm text-gray-500">Plate Size</span>
                    <span className="text-sm font-bold text-gray-900">{selectedJob.plateSize || '—'}</span>
                  </div>
                </div>

                <div className="bg-indigo-600 rounded-2xl shadow-sm shadow-indigo-200 p-5 text-white">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-200 mb-1">Current Status</h5>
                  <div className="text-xl font-black capitalize flex items-center gap-2">
                    {selectedJob.status === 'completed' ? <CheckCircle size={20} className="text-green-300"/> : <Clock size={20} className="text-amber-300"/>}
                    {selectedJob.status || 'pending'}
                  </div>
                </div>
              </div>

              {/* Right Column: Paper Usage */}
              <div className="lg:w-2/3">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Droplets size={16} className="text-sky-500" />
                  Paper Usage Details
                </h4>
                
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                  {/* ── Paper Usage Section ── */}
                  {(() => {
                    const cardKey = selectedJob._id;
                    const totalUnits = parseInt(selectedJob.jobQty) || 0;
                    const paperUsageData = (() => { try { return JSON.parse(localStorage.getItem(`krishnaJobPaperUsage_${cardKey}`) || '[]'); } catch { return []; } })();
                    const usedUnits = paperUsageData.reduce((acc, r) => acc + r.qty, 0);
                    const paperDone = totalUnits > 0 && usedUnits >= totalUnits;
                    const remaining = Math.max(0, totalUnits - usedUnits);
                    const pct = totalUnits > 0 ? Math.min(100, Math.round((usedUnits / totalUnits) * 100)) : 0;

                    return (
                      <div className="mt-2 mb-2">
                        <div className="flex gap-5">
                          <div className="w-10 shrink-0 flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 shadow-sm ${
                              paperDone ? 'bg-sky-500 border-sky-500 text-white shadow-sky-200' : 'bg-white border-sky-300 text-sky-400'
                            }`}>
                              <Droplets size={18} strokeWidth={2.5} />
                            </div>
                          </div>

                          <div className="flex-1 py-1">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h5 className="font-bold text-gray-900 text-base tracking-tight flex items-center gap-2">
                                  Paper Usage
                                  {paperDone && (
                                    <span className="text-[10px] font-black uppercase tracking-wide text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Done</span>
                                  )}
                                </h5>
                                <p className="text-xs text-gray-500">Paper consumed vs. total job quantity</p>
                              </div>
                              {!paperDone && totalUnits > 0 && (
                                <span className="px-2.5 py-1 rounded-md bg-sky-50 text-sky-600 text-xs font-bold tracking-wide uppercase border border-sky-100">
                                  {pct}% used
                                </span>
                              )}
                            </div>

                            {/* Progress bar */}
                            {totalUnits > 0 && (
                              <div className="mb-3">
                                <div className="flex justify-between text-[11px] font-semibold text-gray-500 mb-1">
                                  <span>Used: <strong className="text-gray-800">{usedUnits.toLocaleString()}</strong></span>
                                  <span>Remaining: <strong className={remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}>{remaining.toLocaleString()}</strong></span>
                                  <span>Total: <strong className="text-gray-800">{totalUnits.toLocaleString()}</strong></span>
                                </div>
                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-2 rounded-full transition-all duration-500 ${paperDone ? 'bg-emerald-500' : 'bg-sky-400'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Usage log */}
                            {paperUsageData.length > 0 ? (
                              <div className="space-y-2">
                                {paperUsageData.map((entry, eIdx) => (
                                  <div key={eIdx} className="flex items-center justify-between p-3 rounded-xl border bg-sky-50/50 border-sky-100">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-sky-100 text-sky-600">
                                        <User size={14} />
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold text-gray-900">{entry.userName || 'Unknown'}</p>
                                        <p className="text-xs text-sky-700 font-semibold">Used {entry.qty.toLocaleString()} units</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-100">
                                      <Clock size={12} />
                                      {format(new Date(entry.timestamp), 'MMM d, h:mm a')}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-400 italic">
                                <AlertCircle size={15} />
                                No paper usage recorded yet.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
