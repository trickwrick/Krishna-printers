import React, { useMemo, useState, useEffect } from 'react';
import { format, isSameDay } from 'date-fns';
import { Eye, X, CheckCircle, Clock, User, FileText, Check, Activity, Layers, Printer, FileDigit, Users, AlertCircle, Hash } from 'lucide-react';

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

  // Group job cards by date based on their creation/job date to split the sections
  const grouped = useMemo(() => {
    const map = {};
    jobCards.forEach((card) => {
      const date = new Date(card.jobDate || card.createdAt).toISOString().split('T')[0];
      if (!map[date]) map[date] = [];
      map[date].push(card);
    });
    return Object.entries(map).sort((a, b) => new Date(b[0]) - new Date(a[0]));
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
      {grouped.map(([date, cards]) => {
        const total = cards.length;
        const completed = cards.filter(c => (c.status || 'pending') === 'completed').length;
        const pending = total - completed;

        // Calculate unique active users for this specific date group based on workflow history
        const activeUsersSet = new Set();
        cards.forEach(c => {
          const history = workflowHistory[c._id] || [];
          history.forEach(h => {
            // Check if the history record falls on the same date as the section
            if (isSameDay(new Date(h.timestamp), new Date(date))) {
               if (h.user) activeUsersSet.add(h.user);
            }
          });
        });
        const activeUsers = activeUsersSet.size;

        return (
          <section key={date} className="bg-transparent space-y-6">
            
            {/* Dashboard Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Activity size={100} />
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">{format(new Date(date), 'EEEE, MMMM d, yyyy')}</h2>
                  <p className="text-sm text-gray-500 font-medium mt-1">Work Activity Dashboard</p>
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

            {/* Activity Feed (Cards) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {cards.map((c) => {
                const history = workflowHistory[c._id] || [];
                const recentActivity = history.length > 0 ? history[history.length - 1] : null;
                const currentProgress = workflowProgress[c._id] || 0;
                const progressPercent = (currentProgress / 4) * 100;

                return (
                  <div key={c._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group transition-all hover:shadow-md hover:border-blue-200">
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-bold tracking-wide mb-2">
                            <Hash size={12} />
                            {c.jobNumber}
                          </div>
                          <h3 className="text-base font-bold text-gray-900 line-clamp-1" title={c.jobName}>{c.jobName}</h3>
                          <p className="text-sm text-gray-500 line-clamp-1">{c.partyName}</p>
                        </div>
                        <button 
                          onClick={() => handleOpenModal(c)}
                          className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-600 hover:text-white shrink-0 shadow-sm focus:opacity-100"
                          title="View Full Activity"
                        >
                          <Eye size={18} />
                        </button>
                      </div>

                      {/* Progress Bar Mini */}
                      <div className="mb-4 mt-auto">
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Workflow</span>
                          <span className="text-xs font-bold text-blue-600">{currentProgress}/4 Steps</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex">
                          <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                      </div>

                      {/* Recent Activity */}
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100/80">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Clock size={10} /> Latest Activity
                        </h4>
                        {recentActivity ? (
                          <div className="flex items-start gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                              <User size={12} />
                            </div>
                            <div>
                              <p className="text-sm text-gray-700 font-medium">
                                <span className="font-bold text-gray-900">{recentActivity.user || 'Unknown'}</span> {recentActivity.action === 'Completed' ? 'marked' : 'reverted'} <span className="font-bold text-indigo-600">{WORKFLOW_STEPS[recentActivity.stepNo - 1]?.title}</span> as {recentActivity.action.toLowerCase()}.
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">{format(new Date(recentActivity.timestamp), 'h:mm a')}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400 text-sm italic py-1">
                            <AlertCircle size={14} />
                            No recorded activity yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

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

              {/* Right Column: Workflow Activity Timeline */}
              <div className="lg:w-2/3">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Activity size={16} className="text-blue-500" />
                  Team Activity Timeline
                </h4>
                
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                  <div className="space-y-0">
                    {WORKFLOW_STEPS.map((step, idx) => {
                      const stepNo = idx + 1;
                      const cardKey = selectedJob._id;
                      const currentProgress = workflowProgress[cardKey] || 0;
                      const isDone = currentProgress >= stepNo;
                      
                      const history = workflowHistory[cardKey] || [];
                      // Get all actions for this specific step, sorted chronologically
                      const stepHistory = history.filter(h => h.stepNo === stepNo);

                      return (
                        <div key={idx} className="relative flex gap-5">
                          {/* Timeline vertical line */}
                          {idx !== WORKFLOW_STEPS.length - 1 && (
                            <div className={`absolute top-10 left-5 w-0.5 h-[calc(100%-0.5rem)] -ml-px ${isDone ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
                          )}
                          
                          {/* Step Indicator */}
                          <div className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 shadow-sm mt-1 ${
                            isDone 
                              ? 'bg-blue-500 border-blue-500 text-white shadow-blue-200' 
                              : 'bg-white border-gray-300 text-gray-400'
                          }`}>
                            {isDone ? <Check size={20} strokeWidth={3} /> : <span className="text-base font-black">{stepNo}</span>}
                          </div>

                          {/* Step Content */}
                          <div className={`flex-1 pb-8 ${!isDone && stepHistory.length === 0 ? 'opacity-50' : ''}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-bold text-gray-900 text-lg tracking-tight">{step.title}</h5>
                                <p className="text-sm text-gray-500">{step.desc}</p>
                              </div>
                              {!isDone && <span className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-500 text-xs font-bold tracking-wide uppercase">Pending</span>}
                            </div>
                            
                            {/* History List for this step */}
                            {stepHistory.length > 0 ? (
                              <div className="mt-4 space-y-2">
                                {stepHistory.map((record, hIdx) => (
                                  <div key={hIdx} className={`flex items-center justify-between p-3 rounded-xl border ${record.action === 'Completed' ? 'bg-blue-50/50 border-blue-100' : 'bg-rose-50/50 border-rose-100'}`}>
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${record.action === 'Completed' ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'}`}>
                                        <User size={14} />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">
                                          <span className="font-bold">{record.user || 'Unknown User'}</span>
                                        </p>
                                        <p className={`text-xs font-bold uppercase tracking-wider ${record.action === 'Completed' ? 'text-blue-600' : 'text-rose-600'}`}>
                                          {record.action}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-100">
                                      <Clock size={12} />
                                      {format(new Date(record.timestamp), 'MMM d, h:mm a')}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              isDone && (
                                <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-500 italic">
                                  <AlertCircle size={16} />
                                  Completed (legacy record, no user/time tracked)
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
