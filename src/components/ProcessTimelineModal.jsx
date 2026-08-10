import React from 'react';
import { X, Check, Settings, Image as ImageIcon, FileText, Clock, ChevronRight } from 'lucide-react';

const STAGES = [
  { step: 1, title: 'Design & Proof', desc: 'Artwork, design & client approval' },
  { step: 2, title: 'Printing', desc: 'Plate making & print production' },
  { step: 3, title: 'Binding & Finish', desc: 'Cutting, folding & binding' },
  { step: 4, title: 'QC & Delivery', desc: 'Quality check, packing & dispatch' }
];

export default function ProcessTimelineModal({ isOpen, onClose, jobCard }) {
  if (!isOpen) return null;
  
  const cardKey = jobCard?._id || jobCard?.jobNumber;
  const currentStep = JSON.parse(localStorage.getItem('krishnaJobWorkflowProgress') || '{}')[cardKey] || 0;
  
  // Aggregate all events from backend and local storage
  let aggregatedEvents = jobCard?.timeline ? [...jobCard.timeline] : [];

  if (cardKey) {
    // 1. Paper Usage
    const paperData = JSON.parse(localStorage.getItem(`krishnaJobPaperUsage_${cardKey}`) || '[]');
    paperData.forEach((p, idx) => {
      aggregatedEvents.push({
        _id: `paper_${idx}`,
        action: 'Paper Allocated',
        details: `Added ${p.qty} units of paper`,
        userName: p.userName || 'System',
        timestamp: p.timestamp || jobCard?.createdAt || new Date()
      });
    });

    // 2. Workflow History
    const historyData = JSON.parse(localStorage.getItem('krishnaJobWorkflowHistory') || '{}');
    if (historyData[cardKey]) {
      historyData[cardKey].forEach((w, idx) => {
        const stepNames = { 1: 'Design', 2: 'Printing', 3: 'Binding', 4: 'QC & Delivery' };
        aggregatedEvents.push({
          _id: `wf_${idx}`,
          action: `${stepNames[w.stepNo] || 'Step ' + w.stepNo} ${w.action}`,
          details: `Marked workflow step as ${w.action.toLowerCase()}`,
          userName: w.user || 'System',
          timestamp: w.timestamp || jobCard?.createdAt || new Date()
        });
      });
    }

    // 3. QC Images
    const imgData = localStorage.getItem(`krishnaJobQCImage_${cardKey}`);
    if (imgData) {
      let images = [];
      try {
        images = imgData.startsWith('[') ? JSON.parse(imgData) : [imgData];
      } catch (e) {
        images = [imgData];
      }
      images.forEach((img, idx) => {
        aggregatedEvents.push({
          _id: `img_${idx}`,
          action: 'Image Uploaded',
          details: `Uploaded QC attachment #${idx + 1}`,
          userName: 'System',
          timestamp: jobCard?.createdAt || new Date() 
        });
      });
    }
  }

  // Use actual timeline from jobCard if available, otherwise fallback
  const timelineEvents = aggregatedEvents.length > 0 
    ? aggregatedEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // Sort DESCENDING for feed
    : [
        {
          _id: 'default',
          action: 'Job Created',
          details: 'Job card initialized (Legacy record)',
          userName: 'System',
          timestamp: jobCard?.createdAt || new Date()
        }
      ];

  const getIconForAction = (action) => {
     if (action.includes('Status') || action.includes('Completed')) return <Check size={16} strokeWidth={3} className="text-emerald-500" />;
     if (action.includes('Image')) return <ImageIcon size={16} strokeWidth={3} className="text-purple-500" />;
     if (action.includes('Paper')) return <FileText size={16} strokeWidth={3} className="text-blue-500" />;
     return <Clock size={16} strokeWidth={3} className="text-amber-500" />;
  };

  const getBgForAction = (action) => {
     if (action.includes('Status') || action.includes('Completed')) return 'bg-emerald-50 border-emerald-100';
     if (action.includes('Image')) return 'bg-purple-50 border-purple-100';
     if (action.includes('Paper')) return 'bg-blue-50 border-blue-100';
     return 'bg-amber-50 border-amber-100';
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-[95%] max-w-6xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 bg-white z-10 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              Job Intelligence
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${jobCard?.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                {jobCard?.status || 'Pending'}
              </span>
            </h2>
            <p className="text-sm text-gray-500 font-medium mt-1">
              {jobCard?.jobName} <span className="text-gray-300 mx-2">•</span> {jobCard?.partyName} <span className="text-gray-300 mx-2">•</span> #{jobCard?.jobNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-all active:scale-95"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* Split Body */}
        <div className="flex flex-1 overflow-hidden bg-gray-50/50">
          
          {/* Left Column: Process Milestones */}
          <div className="w-[35%] bg-white border-r border-gray-100 p-8 overflow-y-auto">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-8">Process Milestones</h3>
            
            <div className="relative">
              {/* Vertical connecting line */}
              <div className="absolute left-5.75 top-4 bottom-12 w-0.5 bg-gray-100 z-0" />
              
              {STAGES.map((stage) => {
                const isCompleted = currentStep >= stage.step;
                const isActive = currentStep === stage.step - 1;
                const isPending = currentStep < stage.step - 1;
                
                return (
                  <div key={stage.step} className={`relative z-10 flex gap-6 mb-10 last:mb-0 transition-opacity duration-300 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm
                        ${isCompleted ? 'bg-emerald-500 text-white shadow-emerald-200' : 
                          isActive ? 'bg-blue-600 text-white shadow-blue-200 ring-4 ring-blue-50 scale-110' : 
                          'bg-white border-2 border-gray-200 text-gray-400'}`}>
                        {isCompleted ? <Check size={24} strokeWidth={3} /> : <span className="font-black text-lg">{stage.step}</span>}
                      </div>
                    </div>
                    
                    <div className="pt-2 flex-1">
                      <h4 className={`text-base font-black tracking-tight ${isActive ? 'text-blue-600' : 'text-gray-900'}`}>
                        {stage.title}
                      </h4>
                      <p className="text-sm text-gray-500 font-medium mt-1 leading-relaxed">{stage.desc}</p>
                      
                      {isActive && (
                        <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg animate-pulse">
                          <div className="w-2 h-2 rounded-full bg-blue-500" /> In Progress
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Activity Feed */}
          <div className="w-[65%] p-8 overflow-y-auto relative">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-8">Live Activity Feed</h3>
            
            <div className="relative max-w-2xl">
              <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gray-200/60 z-0" />
              
              {timelineEvents.map((event, index) => (
                <div key={event._id || index} className="flex gap-6 relative z-10 mb-6 group">
                  
                  {/* Icon Node */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-[#fafafa] shadow-sm transition-transform group-hover:scale-110 ${getBgForAction(event.action)}`}>
                      {getIconForAction(event.action)}
                    </div>
                  </div>
                  
                  {/* Event Card */}
                  <div className="flex-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900 flex items-center gap-2">
                        {event.action}
                        <ChevronRight size={14} className="text-gray-300" />
                      </h4>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                        {new Date(event.timestamp).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 font-medium mb-3">{event.details}</p>
                    
                    <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl">
                      <div className="w-5 h-5 rounded-full bg-linear-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-[9px] font-black text-white">
                        {event.userName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <span className="text-xs font-bold text-gray-700">{event.userName}</span>
                    </div>
                  </div>
                  
                </div>
              ))}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
