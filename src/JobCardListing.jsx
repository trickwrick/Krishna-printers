import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusSquare, Trash2, Printer, X, Download, Pencil, RefreshCw, Filter, Search, Check, Share2, Loader2, Building2, Hash, Calendar, Layers, FileText, Globe, MapPin, FileDigit, Eye, EyeOff, ImagePlus, Image as ImageIcon, Settings } from 'lucide-react';
import { downloadAsPDF } from './utils/pdfExport';
import { printElement } from './utils/printDocument';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import { syncPlateUsageFromCards } from './utils/plateUsage';
import { SELLER, TaxFieldsTable, fmtTaxDate, CompanyBrandName } from './utils/taxDocumentPrint';
import { API_BASE_URL } from './utils/apiBase';
import { deleteLocalJobCard, mergeWithLocalJobCards, migrateLocalJobNumbers, updateLocalJobCardField } from './utils/localJobCards';

const BINDING_OPTIONS = [
  { key: 'bindingCenterPin', label: 'Center Pin' },
  { key: 'bindingSilai', label: 'Silai' },
  { key: 'bindingSidePin', label: 'Side Pin' },
  { key: 'bindingFolding', label: 'Folding' },
  { key: 'bindingPerforation', label: 'Perforation' },
  { key: 'bindingNumbring', label: 'Numbring' },
  { key: 'bindingRegister', label: 'Register' },
  { key: 'bindingGlue', label: 'Glue Binding' },
  { key: 'bindingKachhi', label: 'Kechhi Binding' },
  { key: 'bindingPukki', label: 'Pukki Binding' },
];

const getBindingLabel = (card) =>
  BINDING_OPTIONS.filter((item) => card[item.key]).map((item) => item.label).join(', ') || '-';

const WORKFLOW_STEPS = [
  { title: 'Design & Proof', desc: 'Artwork, design & client approval', owner: 'Super Admin 1' },
  { title: 'Printing', desc: 'Plate making & print production', owner: 'Super Admin 2' },
  { title: 'Binding & Finish', desc: 'Cutting, folding & binding', owner: 'Admin 1' },
  { title: 'QC & Delivery', desc: 'Quality check, packing & dispatch', owner: 'Admin 2' },
];

const readWorkflowProgress = () => {
  try {
    return JSON.parse(localStorage.getItem('krishnaJobWorkflowProgress') || '{}');
  } catch {
    return {};
  }
};

const getCardKey = (card) => card?._id || card?.jobNumber || '';

const getTimeLeft = (card) => {
  const completionDays = Number(card.completionDays) || 0;
  if (!completionDays) return null;

  const start = new Date(card.createdAt || card.jobDate || Date.now());
  const due = new Date(start);
  due.setDate(start.getDate() + completionDays);

  const diffMs = due.getTime() - Date.now();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return {
    days: Math.max(0, days),
    overdue: days < 0,
  };
};

export default function JobCardListing() {
  const navigate = useNavigate();
  const [jobCards, setJobCards] = useState([]);
  const [workflowProgress, setWorkflowProgress] = useState(() => readWorkflowProgress());
  const [stepConfirm, setStepConfirm] = useState(null);
  const [imageBlockAlert, setImageBlockAlert] = useState(false);
  const [paperUsageModalCard, setPaperUsageModalCard] = useState(null);
  const [paperUsageInput, setPaperUsageInput] = useState('');
  const [paperBlockAlert, setPaperBlockAlert] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState(() => {
    const saved = localStorage.getItem('jobCardColumnVisibility');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved visibility:", e);
      }
    }
    return {
      partyName: true,
      jobNumber: true,
      jobDate: true,
      jobQty: true,
      jobName: true,
      pageSize: true,
      pageCount: false,
      printingType: true,
      paper: true,
      paperGSM: true,
      innerPaperGSM: false,
      lamination: true,
      binding: true,
      createdAt: true
    };
  });

  useEffect(() => {
    localStorage.setItem('jobCardColumnVisibility', JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  const handleAddPaperUsage = () => {
    if (!paperUsageModalCard || !paperUsageInput) return;
    const cardKey = getCardKey(paperUsageModalCard);
    const qty = parseInt(paperUsageInput, 10);
    if (isNaN(qty) || qty <= 0) return;

    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{"name": "Admin"}');

    // Validate: qty cannot exceed remaining units
    const totalUnits = parseInt(paperUsageModalCard?.jobQty) || 0;
    const existingData = JSON.parse(localStorage.getItem(`krishnaJobPaperUsage_${cardKey}`) || '[]');
    const usedSoFar = existingData.reduce((acc, r) => acc + r.qty, 0);
    const remaining = Math.max(0, totalUnits - usedSoFar);

    if (totalUnits > 0 && qty > remaining) {
      alert(`Only ${remaining.toLocaleString()} units remaining. Cannot add ${qty.toLocaleString()} units.`);
      return;
    }

    existingData.push({
      qty,
      userName: currentUser.name,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(`krishnaJobPaperUsage_${cardKey}`, JSON.stringify(existingData));
    setPaperUsageInput('');
    setJobCards(prev => [...prev]); // force re-render
  };



  const loadData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobcard`);
      const data = response.ok ? await response.json() : [];
      const mergedData = mergeWithLocalJobCards(data);
      syncPlateUsageFromCards(mergedData);
      setJobCards(mergedData);
    } catch (error) {
      console.error("Error loading job cards:", error);
      setJobCards(mergeWithLocalJobCards([]));
    }
  };

  useEffect(() => {
    migrateLocalJobNumbers(); // rename any existing LOCAL-XXXXXX cards to JOBKP-XXXX
    loadData();
    setWorkflowProgress(readWorkflowProgress());

    // Close filter dropdown on click outside
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const refreshData = () => {
    setWorkflowProgress(readWorkflowProgress());
    loadData();
  };

  const handleImageUpload = (e, cardKey) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      let existing = [];
      try {
        const data = localStorage.getItem(`krishnaJobQCImage_${cardKey}`);
        if (data) {
          existing = data.startsWith('[') ? JSON.parse(data) : [data];
        }
      } catch (err) {
        existing = [];
      }
      
      let loadedCount = 0;
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          existing.push(event.target.result);
          loadedCount++;
          if (loadedCount === files.length) {
            localStorage.setItem(`krishnaJobQCImage_${cardKey}`, JSON.stringify(existing));
            setJobCards(prev => [...prev]); // force re-render
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleViewImage = (cardKey) => {
    const data = localStorage.getItem(`krishnaJobQCImage_${cardKey}`);
    if (data) {
      let images = [];
      try {
        images = data.startsWith('[') ? JSON.parse(data) : [data];
      } catch (e) {
        images = [data];
      }
      
      if (images.length > 0) {
        const win = window.open();
        const imgTags = images.map(img => `<img src="${img}" style="max-width:100%;max-height:90vh;object-fit:contain;margin-bottom:20px;box-shadow:0 4px 6px rgba(0,0,0,0.3);border-radius:8px;" />`).join('');
        win.document.write(`<body style="margin:0;background:#111;display:flex;flex-direction:column;align-items:center;padding:20px;min-height:100vh;overflow-y:auto;">${imgTags}</body>`);
      }
    }
  };

  const promptStepClick = (cardKey, stepNo) => {
    const current = workflowProgress[cardKey] || 0;
    const isTryingToMarkDone = current < stepNo;

    // Step 3 (Binding & Finish) requires Paper Status to be complete
    if (stepNo === 3 && isTryingToMarkDone) {
      const card = jobCards.find(c => getCardKey(c) === cardKey);
      const totalUnits = parseInt(card?.jobQty) || 0;
      const data = JSON.parse(localStorage.getItem(`krishnaJobPaperUsage_${cardKey}`) || '[]');
      const usedUnits = data.reduce((acc, curr) => acc + curr.qty, 0);
      const isPaperComplete = totalUnits > 0 && usedUnits >= totalUnits;
      
      if (!isPaperComplete) {
        setPaperBlockAlert(true);
        return;
      }
    }

    // Step 4 (QC & Delivery) requires at least one image uploaded
    if (stepNo === 4 && isTryingToMarkDone) {
      const imageData = localStorage.getItem(`krishnaJobQCImage_${cardKey}`);
      if (!imageData) {
        setImageBlockAlert(true);
        return;
      }
    }
    setStepConfirm({ cardKey, stepNo });
  };

  const executeStepClick = () => {
    if (!stepConfirm) return;
    const { cardKey, stepNo } = stepConfirm;
    
    setWorkflowProgress(prev => {
      const current = prev[cardKey] || 0;
      const newVal = current === stepNo ? stepNo - 1 : stepNo;
      const newProgress = { ...prev, [cardKey]: newVal };
      localStorage.setItem('krishnaJobWorkflowProgress', JSON.stringify(newProgress));
      
      // Also log to history
      const action = newVal > current ? 'Completed' : 'Reverted';
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{"name": "Admin"}');
      const history = JSON.parse(localStorage.getItem('krishnaJobWorkflowHistory') || '{}');
      if (!history[cardKey]) history[cardKey] = [];
      
      history[cardKey].push({
        stepNo,
        action,
        timestamp: new Date().toISOString(),
        user: currentUser.name
      });
      localStorage.setItem('krishnaJobWorkflowHistory', JSON.stringify(history));

      // ── Auto-update job card status based on QC & Delivery (step 4) ──
      // If step 4 is fully completed → status = 'completed'
      // If step 4 is reverted (< 4) → status = 'in-progress'
      const autoStatus = newVal >= 4 ? 'completed' : (newVal > 0 ? 'in-progress' : 'pending');

      // Update local state immediately
      setJobCards(prevCards =>
        prevCards.map(c => {
          const key = c._id || c.jobNumber;
          if (key === cardKey) return { ...c, status: autoStatus };
          return c;
        })
      );

      // Persist to localJobCards (for local-only cards)
      updateLocalJobCardField(cardKey, { status: autoStatus });

      // Best-effort server sync
      fetch(`${API_BASE_URL}/api/jobcard/${cardKey}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: autoStatus }),
      }).catch(() => { /* server unavailable – local already updated */ });

      return newProgress;
    });
    setStepConfirm(null);
  };

  const cancelStepClick = () => {
    setStepConfirm(null);
  };

  const getBindingText = (card) => {
    const bindings = [
      { key: 'bindingCenterPin', label: 'Center Pin' },
      { key: 'bindingSilai', label: 'Silai' },
      { key: 'bindingSidePin', label: 'Side Pin' },
      { key: 'bindingFolding', label: 'Folding' },
      { key: 'bindingPerforation', label: 'Perforation' },
      { key: 'bindingNumbring', label: 'Numbring' },
      { key: 'bindingRegister', label: 'Register' },
      { key: 'bindingGlue', label: 'Glue Binding' },
      { key: 'bindingKachhi', label: 'Kechhi Binding' },
      { key: 'bindingPukki', label: 'Pukki Binding' }
    ].filter(b => card[b.key]).map(b => b.label);
    return bindings.length > 0 ? bindings : null;
  };

  const formatShortDate = (value) =>
    new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const formatShortDateTime = (value) => {
    const d = new Date(value);
    return {
      date: d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' }),
      time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
  };

  const exportToCSV = () => {
    const visibleData = jobCards.map(card => {
      const exportRow = {};
      if (columnVisibility.partyName) exportRow['Party Name'] = card.partyName;
      if (columnVisibility.jobNumber) exportRow['Job Number'] = card.jobNumber;
      if (columnVisibility.jobDate) exportRow['Job Date'] = new Date(card.jobDate).toLocaleDateString();
      if (columnVisibility.jobQty) exportRow['Job Qty'] = card.jobQty || 0;
      if (columnVisibility.pageSize) exportRow['Page Size'] = card.pageSize || '-';
      if (columnVisibility.pageCount) exportRow['Page Count'] = card.pageCount || '-';
      if (columnVisibility.printingType) exportRow['Color'] = card.printingType || '-';
      if (columnVisibility.paper) exportRow['Paper'] = card.paper || '-';
      if (columnVisibility.paperGSM) exportRow['Paper GSM'] = card.paperGSM || '-';
      if (columnVisibility.lamination) exportRow['Lamination'] = card.lamination || '-';
      if (columnVisibility.binding) exportRow['Binding'] = (getBindingText(card) || []).join(' • ');
      if (columnVisibility.createdAt) exportRow['Created At'] = new Date(card.createdAt).toLocaleString();
      return exportRow;
    });

    if (visibleData.length === 0) return;

    const headers = Object.keys(visibleData[0]);
    const csvContent = [
      headers.join(','),
      ...visibleData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `job_card_listing_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleColumn = (col) => {
    setColumnVisibility(prev => ({ ...prev, [col]: !prev[col] }));
  };

  const filteredCards = jobCards.filter(card =>
    card.partyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.jobName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.jobNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);

  const handleDelete = (id) => {
    setCardToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (cardToDelete) {
      const card = jobCards.find((item) => item._id === cardToDelete);
      if (card?.localOnly) {
        deleteLocalJobCard(cardToDelete);
        try {
          await fetch(`${API_BASE_URL}/api/jobcard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...card, isDeleted: true, deletedAt: new Date() })
          });
        } catch (e) {
          console.error("Failed to sync soft delete to server:", e);
        }
        setJobCards(jobCards.filter((item) => item._id !== cardToDelete));
        setIsDeleteModalOpen(false);
        setCardToDelete(null);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/jobcard/${cardToDelete}`, {
          method: "DELETE"
        });
        if (response.ok) {
          setJobCards(jobCards.filter(card => card._id !== cardToDelete));
          setIsDeleteModalOpen(false);
          setCardToDelete(null);
        } else {
          console.error("Failed to delete job card");
        }
      } catch (error) {
        console.error("Error deleting job card:", error);
      }
    }
  };

  const [selectedCard, setSelectedCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openPreview = (card) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const closePreview = () => {
    setIsModalOpen(false);
    setSelectedCard(null);
  };

  const handlePrint = () => {
    window.scrollTo(0, 0);
    const container = document.querySelector('.a4-page-container');
    if (container) container.scrollTop = 0;
    printElement('printable-inner');
  };

  const handleSharePDF = async () => {
    await downloadAsPDF(
      'printable-inner',
      `JobCard_${selectedCard?.jobNumber || 'preview'}`,
      setIsGenerating
    );
  };

  return (
    <div className="w-full px-0 mt-8 pb-12 max-w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 group flex items-center gap-3">
            <div className="bg-blue-600 w-1.5 h-6 rounded-full" />
            Job Card Listings
          </h1>
          <p className="text-gray-500 mt-1 font-medium text-sm sm:text-base italic">Manage and view all your job cards</p>
        </div>
        <button
          onClick={() => navigate('/job-card')}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
        >
          <PlusSquare size={20} />
          Add New Job Card
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-t-2xl border-x border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 no-print">
        <div className="relative w-full sm:max-w-xs md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={refreshData}
            className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-all border border-gray-200 group shrink-0"
            title="Refresh Data"
          >
            <RefreshCw size={18} className="group-active:rotate-180 transition-transform duration-500" />
          </button>
          <button
            onClick={exportToCSV}
            className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-all border border-gray-200 flex items-center gap-2 text-sm font-semibold shrink-0"
            title="Export CSV"
          >
            <Download size={18} /> <span className="hidden xs:inline">Export</span>
          </button>

          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-2.5 rounded-xl transition-all border flex items-center gap-2 text-sm font-semibold ${isFilterOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'text-gray-600 border-gray-200 hover:bg-gray-100'}`}
            >
              <Filter size={18} /> <span className="hidden xs:inline">Filter</span>
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Column Display</h3>
                <div className="space-y-1 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                  {[
                    { id: 'partyName', label: 'Party Name' },
                    { id: 'jobNumber', label: 'Job Number' },
                    { id: 'jobDate', label: 'Job Date' },
                    { id: 'jobQty', label: 'Job Qty' },
                    { id: 'jobName', label: 'Item Name' },
                    { id: 'pageSize', label: 'Item Size' },
                    { id: 'pageCount', label: 'Page Count' },
                    { id: 'printingType', label: 'Color' },
                    { id: 'paper', label: 'Paper' },
                    { id: 'paperGSM', label: 'Cover GSM' },
                    { id: 'innerPaperGSM', label: 'Inner GSM' },
                    { id: 'lamination', label: 'Lamination' },
                    { id: 'binding', label: 'Binding' },
                    { id: 'createdAt', label: 'Created At' }
                  ].map((col) => (
                    <label key={col.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group">
                      <span className="text-sm font-medium text-gray-700">{col.label}</span>
                      <div
                        onClick={(e) => { e.preventDefault(); toggleColumn(col.id); }}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${columnVisibility[col.id] ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white group-hover:border-blue-400'}`}
                      >
                        {columnVisibility[col.id] && <Check size={12} className="text-white" strokeWidth={4} />}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden no-print max-w-full">
        <div className="w-full overflow-x-auto job-card-list-table-wrap">
          <table className="w-full table-fixed text-xs text-left min-w-180">
            <colgroup>
              <col style={{ width: '28px' }} />
              {columnVisibility.partyName && <col style={{ width: '13%' }} />}
              {columnVisibility.jobNumber && <col style={{ width: '9%' }} />}
              {columnVisibility.jobDate && <col style={{ width: '7%' }} />}
              {columnVisibility.jobQty && <col style={{ width: '10%' }} />}
              {columnVisibility.jobName && <col style={{ width: '14%' }} />}
              {columnVisibility.pageSize && <col style={{ width: '7%' }} />}
              {columnVisibility.pageCount && <col style={{ width: '5%' }} />}
              {columnVisibility.printingType && <col style={{ width: '7%' }} />}
              {columnVisibility.paper && <col style={{ width: '7%' }} />}
              {columnVisibility.paperGSM && <col style={{ width: '5%' }} />}
              {columnVisibility.innerPaperGSM && <col style={{ width: '5%' }} />}
              {columnVisibility.lamination && <col style={{ width: '7%' }} />}
              {columnVisibility.binding && <col style={{ width: '8%' }} />}
              {columnVisibility.createdAt && <col style={{ width: '9%' }} />}
              <col style={{ width: '56px' }} />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 uppercase tracking-wide text-[10px]">
                <th className="py-2 px-0.5 text-center normal-case tracking-normal">#</th>
                {columnVisibility.partyName && <th className="py-2 px-1.5 wrap-break-word whitespace-normal leading-tight">Party Name</th>}
                {columnVisibility.jobNumber && <th className="py-2 px-1.5 whitespace-normal leading-tight">Job No.</th>}
                {columnVisibility.jobDate && <th className="py-2 px-1.5 leading-tight">Date</th>}
                {columnVisibility.jobQty && <th className="py-2 px-1.5 wrap-break-word whitespace-normal leading-tight">Qty</th>}
                {columnVisibility.jobName && <th className="py-2 px-1.5 wrap-break-word whitespace-normal leading-tight">Item Name</th>}
                {columnVisibility.pageSize && <th className="py-2 px-1.5 wrap-break-word whitespace-normal leading-tight">Size</th>}
                {columnVisibility.pageCount && <th className="py-2 px-1.5 leading-tight">Pages</th>}
                {columnVisibility.printingType && <th className="py-2 px-1.5 wrap-break-word whitespace-normal leading-tight">Color</th>}
                {columnVisibility.paper && <th className="py-2 px-1.5 wrap-break-word whitespace-normal leading-tight">Paper</th>}
                {columnVisibility.paperGSM && <th className="py-2 px-1.5 leading-tight">C.GSM</th>}
                {columnVisibility.innerPaperGSM && <th className="py-2 px-1.5 leading-tight">I.GSM</th>}
                {columnVisibility.lamination && <th className="py-2 px-1.5 wrap-break-word whitespace-normal leading-tight">Lam.</th>}
                {columnVisibility.binding && <th className="py-2 px-1.5 wrap-break-word whitespace-normal leading-tight">Binding</th>}
                {columnVisibility.createdAt && <th className="py-2 px-1.5 wrap-break-word whitespace-normal leading-tight">Created</th>}
                <th className="py-2 px-1 text-center leading-tight">Action</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {filteredCards.length === 0 ? (
                <tr>
                  <td colSpan="20" className="py-8 text-center text-gray-500 text-sm">
                    No job cards found.
                  </td>
                </tr>
              ) : (
                filteredCards.map((card, index) => {
                  const cardKey = getCardKey(card);
                  const doneSteps = workflowProgress[cardKey] || 0;
                  const timeLeft = getTimeLeft(card);
                  const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-blue-50/40';
                  const rowHoverBg = index % 2 === 0 ? 'hover:bg-gray-50' : 'hover:bg-blue-50/70';

                  return (
                    <React.Fragment key={cardKey || index}>
                      <tr className={`border-b-0 border-gray-50 transition-colors ${rowBg} ${rowHoverBg}`}>
                        <td className="py-2 px-0.5 text-gray-500 align-top text-center text-[11px]">{index + 1}</td>
                        {columnVisibility.partyName && (
                          <td className="py-2 px-1.5 font-medium text-gray-900 align-top wrap-break-word whitespace-normal leading-snug">{card.partyName}</td>
                        )}
                        {columnVisibility.jobNumber && (
                          <td className="py-2 px-1.5 align-top wrap-break-word whitespace-normal leading-snug">
                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-semibold inline-block break-all">
                              {card.jobNumber}
                            </span>
                          </td>
                        )}
                        {columnVisibility.jobDate && (
                          <td className="py-2 px-1.5 text-gray-500 align-top whitespace-normal leading-snug">
                            {formatShortDate(card.jobDate)}
                          </td>
                        )}
                        {columnVisibility.jobQty && (
                          <td className="py-2 px-1.5 text-gray-800 font-semibold align-top break-all whitespace-normal overflow-hidden max-w-0 leading-snug">
                            {card.jobQty || 0}
                          </td>
                        )}
                        {columnVisibility.jobName && (
                          <td className="py-2 px-1.5 text-gray-900 align-top wrap-break-word whitespace-normal leading-snug">{card.jobName || '-'}</td>
                        )}
                        {columnVisibility.pageSize && (
                          <td className="py-2 px-1.5 text-gray-700 align-top wrap-break-word whitespace-normal leading-snug">{card.pageSize || '-'}</td>
                        )}
                        {columnVisibility.pageCount && (
                          <td className="py-2 px-1.5 text-gray-700 align-top">{card.pageCount || '-'}</td>
                        )}
                        {columnVisibility.printingType && (
                          <td className="py-2 px-1.5 align-top wrap-break-word whitespace-normal leading-snug">
                            {card.printingType ? (
                              <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-medium inline-block">{card.printingType}</span>
                            ) : '-'}
                          </td>
                        )}
                        {columnVisibility.paper && (
                          <td className="py-2 px-1.5 text-gray-700 align-top wrap-break-word whitespace-normal leading-snug">{card.paper || '-'}</td>
                        )}
                        {columnVisibility.paperGSM && <td className="py-2 px-1.5 text-gray-700 align-top">{card.paperGSM || '-'}</td>}
                        {columnVisibility.innerPaperGSM && <td className="py-2 px-1.5 text-gray-700 align-top">{card.innerPaperGSM || '-'}</td>}
                        {columnVisibility.lamination && (
                          <td className="py-2 px-1.5 align-top wrap-break-word whitespace-normal leading-snug">
                            {card.lamination ? (
                              <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-medium inline-block">{card.lamination}</span>
                            ) : <span className="text-gray-400">-</span>}
                          </td>
                        )}
                        {columnVisibility.binding && (
                          <td className="py-2 px-1.5 align-top wrap-break-word whitespace-normal leading-snug">
                            {(() => {
                              const chips = getBindingText(card);
                              return chips ? (
                                <div className="flex flex-wrap gap-0.5">
                                  {chips.map((b, i) => (
                                    <span key={i} className="bg-amber-50 text-amber-700 border border-amber-100 px-1 py-0.5 rounded text-[9px] font-semibold">{b}</span>
                                  ))}
                                </div>
                              ) : <span className="text-gray-400">-</span>;
                            })()}
                          </td>
                        )}
                        {columnVisibility.createdAt && (
                          <td className="py-2 px-1.5 text-gray-500 align-top wrap-break-word whitespace-normal leading-tight">
                            <span className="block">{formatShortDateTime(card.createdAt).date}</span>
                            <span className="block text-[10px] text-gray-400">{formatShortDateTime(card.createdAt).time}</span>
                          </td>
                        )}
                        <td className="py-2 px-0.5 align-top">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              onClick={() => setExpandedRows(prev => ({ ...prev, [cardKey]: !prev[cardKey] }))}
                              className="text-amber-500 hover:text-amber-700 hover:bg-amber-50 p-0.5 rounded transition-colors focus:outline-none"
                              title="Toggle Workflow Timeline"
                            >
                              {expandedRows[cardKey] ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                            <button
                              onClick={() => openPreview(card)}
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-0.5 rounded transition-colors focus:outline-none"
                              title="Print Preview"
                            >
                              <Printer size={13} />
                            </button>
                            <button
                              onClick={() => navigate('/job-card', { state: { editData: card } })}
                              className="text-teal-500 hover:text-teal-700 hover:bg-teal-50 p-0.5 rounded transition-colors focus:outline-none"
                              title="Edit"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(card._id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-0.5 rounded transition-colors focus:outline-none"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      <tr className={`border-b border-gray-100 ${rowBg}`}>
                        <td colSpan="20" className="p-0 border-0">
                          <div
                            className={`grid transition-all duration-300 ease-in-out ${
                              expandedRows[cardKey] ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className="px-12 pb-4 pt-1 flex items-center gap-4">
                                <div className="flex-1 min-w-155">
                                  <div className="relative grid grid-cols-4 gap-4">
                                    <div className="absolute left-[12%] right-[12%] top-4 h-px bg-gray-200" />
                                    
                                      {/* New Icon between Step 2 (Printing) and Step 3 (Binding) */}
                                      <div className="absolute left-[50%] top-4 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                                        <div className="bg-white rounded-full p-1 border border-gray-200 shadow-sm flex items-center gap-1">
                                          <button 
                                            onClick={() => setPaperUsageModalCard(card)}
                                            className="p-1 hover:bg-gray-100 rounded-full transition-colors text-blue-500 hover:text-blue-700 relative"
                                            title="Paper Usage Status"
                                          >
                                            <Settings size={14} />
                                          </button>
                                        </div>
                                        {(() => {
                                          const totalUnits = parseInt(card.jobQty) || 0;
                                          const data = JSON.parse(localStorage.getItem(`krishnaJobPaperUsage_${cardKey}`) || '[]');
                                          const usedUnits = data.reduce((acc, curr) => acc + curr.qty, 0);
                                          return totalUnits > 0 && usedUnits >= totalUnits;
                                        })() ? (
                                          <span 
                                            onClick={() => setPaperUsageModalCard(card)}
                                            className="text-[8px] font-bold text-emerald-600 mt-1 uppercase tracking-wide bg-emerald-50 px-1 border border-emerald-200 rounded cursor-pointer"
                                          >
                                            Paper Done
                                          </span>
                                        ) : (
                                          <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase tracking-wide bg-white px-1">Paper</span>
                                        )}
                                      </div>

                                      {/* Upload Image Button between Step 3 (Binding) and Step 4 (QC) */}
                                      <div className="absolute left-[75%] top-4 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                                        <div className="bg-white rounded-full p-1 border border-gray-200 shadow-sm flex items-center gap-1">
                                          <label className="cursor-pointer p-1 hover:bg-gray-100 rounded-full transition-colors" title="Upload Image">
                                            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageUpload(e, cardKey)} />
                                            <ImagePlus size={14} className="text-gray-500 hover:text-blue-600" />
                                          </label>
                                          {(() => {
                                            const data = localStorage.getItem(`krishnaJobQCImage_${cardKey}`);
                                            if (!data) return null;
                                            let count = 1;
                                            try { count = data.startsWith('[') ? JSON.parse(data).length : 1; } catch (e) {}
                                            return (
                                              <button 
                                                onClick={() => handleViewImage(cardKey)}
                                                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-emerald-500 hover:text-emerald-700 relative" 
                                                title="View Images"
                                              >
                                                <ImageIcon size={14} />
                                                {count > 1 && (
                                                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-3.5 h-3.5 flex items-center justify-center px-0.5">
                                                    {count}
                                                  </span>
                                                )}
                                              </button>
                                            );
                                          })()}
                                        </div>
                                        <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase tracking-wide bg-white px-1">Challan Proof</span>
                                      </div>

                                    {(() => {
                                      const historyStr = localStorage.getItem('krishnaJobWorkflowHistory');
                                      let cardHistory = [];
                                      try {
                                        if (historyStr) cardHistory = JSON.parse(historyStr)[cardKey] || [];
                                      } catch (e) {}

                                      return WORKFLOW_STEPS.map((step, stepIndex) => {
                                        const stepNo = stepIndex + 1;
                                        const done = doneSteps >= stepNo;
                                        const active = doneSteps + 1 === stepNo;
                                        const current = doneSteps;

                                        let completedBy = null;
                                        if (done) {
                                          const lastCompletion = cardHistory.slice().reverse().find(h => h.stepNo === stepNo && h.action === 'Completed');
                                          if (lastCompletion && lastCompletion.user) {
                                            completedBy = lastCompletion.user;
                                          }
                                        }

                                        return (
                                          <div key={step.title} className="relative z-10 text-center flex flex-col items-center">
                                            <div 
                                              onClick={() => promptStepClick(cardKey, stepNo)}
                                              className={`mx-auto w-8 h-8 rounded-full border-4 flex items-center justify-center text-[11px] font-black shadow-sm cursor-pointer hover:scale-110 transition-transform ${
                                                done ? 'bg-emerald-500 border-emerald-100 text-white' : active ? 'bg-blue-600 border-blue-100 text-white' : 'bg-gray-100 border-white text-gray-500 hover:border-gray-200'
                                              }`}
                                              title={`Mark Step ${stepNo} as ${current === stepNo ? 'pending' : 'done'}`}
                                            >
                                              {done ? <Check size={14} strokeWidth={4} /> : stepNo}
                                            </div>
                                            <p className="mt-2 text-[11px] font-black text-gray-900">{step.title}</p>
                                            <p className="mt-0.5 text-[9px] text-gray-400">{step.desc}</p>
                                            <span 
                                              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[8px] font-black uppercase ${
                                                done || active ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                                              }`}
                                              title={done && completedBy ? `Completed by ${completedBy}` : step.owner}
                                            >
                                              {done && completedBy ? completedBy : step.owner}
                                            </span>
                                              <button
                                                onClick={() => promptStepClick(cardKey, stepNo)}
                                                className={`mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase transition-colors flex items-center justify-center gap-1 border ${
                                                  done ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' : active ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                                }`}
                                              >
                                                {done ? 'Undo' : 'Mark Done'}
                                              </button>
                                            </div>
                                          );
                                        });
                                      })()}
                                  </div>
                                </div>
                                {timeLeft && (
                                  <div className={`w-24 rounded-xl border p-3 text-center shrink-0 ${timeLeft.overdue ? 'bg-red-50 border-red-100 text-red-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                                    <p className="text-[9px] font-black uppercase">Time Left</p>
                                    <p className="text-2xl font-black leading-none mt-1">{timeLeft.days}</p>
                                    <p className="text-[10px] font-bold mt-0.5">days</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Preview Modal */}
      {isModalOpen && selectedCard && (
        <div className="print-modal-overlay fixed inset-0 bg-black/60 z-100 flex items-stretch sm:items-center justify-center p-0 sm:p-4 overflow-y-auto print:static print:overflow-visible print:bg-white print:p-0">
          <div className="print-modal-shell job-card-modal-shell bg-white border border-gray-300 w-full max-w-4xl sm:max-w-4xl relative h-dvh sm:h-auto max-h-dvh sm:max-h-[95vh] flex flex-col shadow-none print:max-h-none print:overflow-visible print:border-0 print:shadow-none print:h-auto">
            <div className="modal-header print-modal-header no-print p-3 sm:p-4 border-b bg-white">
              <div className="print-modal-title-row flex items-center justify-between gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Job Card Preview</h2>
                <button
                  onClick={closePreview}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors shrink-0"
                  aria-label="Close preview"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <p className="print-preview-hint no-print px-3 py-2 text-[11px] font-semibold text-blue-700 bg-blue-50 border-b border-blue-100 sm:hidden">
              Swipe left/right to view the full job card before printing.
            </p>

            {/* Modal Body - Printable Content */}
            <div className="p-2 overflow-y-auto overflow-x-auto grow a4-page-container print:overflow-visible print:max-h-none print:h-auto print:p-0 print:grow-0" id="printable-content">
              <div
                id="printable-inner"
                className="bg-white w-full shadow-none tax-invoice-print-page"
              >
                <table className="tax-invoice job-card-print-table w-full border-collapse text-black" style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                  <colgroup>
                    <col style={{ width: '8.33%' }} />
                    <col style={{ width: '8.33%' }} />
                    <col style={{ width: '8.33%' }} />
                    <col style={{ width: '8.33%' }} />
                    <col style={{ width: '8.33%' }} />
                    <col style={{ width: '8.33%' }} />
                    <col style={{ width: '8.33%' }} />
                    <col style={{ width: '8.33%' }} />
                    <col style={{ width: '8.33%' }} />
                    <col style={{ width: '8.33%' }} />
                    <col style={{ width: '8.33%' }} />
                    <col style={{ width: '8.33%' }} />
                  </colgroup>
                  <tbody>
                    <tr>
                      <td colSpan={12} className="tax-cell align-top p-0 job-card-top-header">
                        <div className="flex justify-between items-start gap-4 p-2">
                          <div className="job-card-company-header flex-1 min-w-0">
                            <CompanyBrandName className="text-left job-card-brand leading-none mb-1" large />
                            {SELLER.address ? (
                              <p className="tax-header-line text-left whitespace-pre-wrap leading-tight max-w-sm my-1">{SELLER.address}</p>
                            ) : (
                              <>
                                <p className="tax-header-line text-left">Office: {SELLER.office}</p>
                                <p className="tax-header-line text-left">Factory: {SELLER.factory}</p>
                              </>
                            )}
                            {(SELLER.tel || SELLER.email) && (
                              <p className="tax-header-line text-left">
                                {[SELLER.tel, SELLER.email].filter(Boolean).join(', ')}
                              </p>
                            )}
                            <p className="tax-header-line text-left">
                              <span className="tax-field-label">GSTIN :</span> {SELLER.gstin}
                              <span className="ml-4 tax-field-label">PAN :</span> {SELLER.pan}
                            </p>
                          </div>
                          <div className="job-card-doc-badge bg-blue-600 text-white px-5 py-1.5 rounded-md text-[11px] font-black uppercase tracking-widest shrink-0">
                            JOB CARD
                          </div>
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td colSpan={6} className="tax-cell align-top job-card-meta-cell p-1.5">
                        <TaxFieldsTable rows={[
                          ['Job Number', selectedCard.jobNumber],
                          ['Job Date', fmtTaxDate(selectedCard.jobDate)],
                          ['Job Qty', selectedCard.jobQty || '-'],
                          ['Item Name', selectedCard.jobName || '-'],
                        ]} />
                      </td>
                      <td colSpan={6} className="tax-cell align-top job-card-meta-cell p-1.5">
                        <TaxFieldsTable rows={[
                          ['Party Name', selectedCard.partyName],
                          ['Contact', selectedCard.contactNo || '-'],
                          ['GST No.', selectedCard.gstNo || '-'],
                          ['Item Size', selectedCard.pageSize || '-'],
                        ]} />
                      </td>
                    </tr>

                    <tr>
                      <td colSpan={12} className="tax-cell align-top p-0">
                        <div className="tax-blue job-card-section-title text-center py-1 px-2">Party Details</div>
                        <div className="job-card-section-body p-1.5">
                          <TaxFieldsTable rows={[
                            ['Address', selectedCard.address || '-'],
                            ['E-MAIL', selectedCard.emailId || '-'],
                            ['Color Detail', selectedCard.printingType || '-'],
                          ]} />
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td colSpan={6} className="tax-cell align-top p-0">
                        <div className="tax-blue job-card-section-title text-center py-1 px-2">Production Specs</div>
                        <div className="job-card-section-body p-1.5">
                          <TaxFieldsTable rows={[
                            ['Compose', selectedCard.compose || 'No'],
                            ['Design', selectedCard.design || 'No'],
                            ['Paper Source', selectedCard.paperSource || 'Company paper'],
                            ['Paper Type', selectedCard.paper || '-'],
                          ]} />
                        </div>
                      </td>
                      <td colSpan={6} className="tax-cell align-top p-0">
                        <div className="tax-blue job-card-section-title text-center py-1 px-2">Press Details</div>
                        <div className="job-card-section-body p-1.5">
                          <TaxFieldsTable rows={[
                            ['Plate Type', selectedCard.plateType || 'New'],
                            ['Plate Size', selectedCard.plateSize || '-'],
                            ['Plate Number', selectedCard.plateUseCount || '-'],
                            ['Plate Qty', selectedCard.plateQty ?? 0],
                            ['Lamination', selectedCard.lamination || '-'],
                            ['Printing Qty', selectedCard.printingQty || 0],
                          ]} />
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td colSpan={6} className="tax-cell align-top p-0">
                        <div className="tax-blue job-card-section-title text-center py-1 px-2">Paper &amp; Stock</div>
                        <div className="job-card-section-body p-1.5">
                          <TaxFieldsTable rows={[
                            ['Paper Count / GSM', `${selectedCard.coverPaperCount || 0} (${selectedCard.paperGSM || '-'})`],
                            ['Paper Details', selectedCard.coverPaperDetails || '-'],
                          ]} />
                        </div>
                      </td>
                      <td colSpan={6} className="tax-cell align-top p-0">
                        <div className="tax-blue job-card-section-title text-center py-1 px-2">Post-Press / Binding</div>
                        <div className="job-card-section-body p-1.5">
                          <TaxFieldsTable rows={[
                            ['Binding Options', getBindingLabel(selectedCard)],
                          ]} />
                        </div>
                      </td>
                    </tr>

                    <tr className="avoid-break">
                      <td colSpan={12} className="tax-cell align-top p-0">
                        <div className="tax-blue job-card-section-title text-center py-1 px-2">Work Instructions</div>
                        <div className="job-card-section-body job-card-work-instructions p-2" style={{ minHeight: '60px' }}>
                          <p className="job-card-work-instructions-text leading-relaxed m-0">
                            {selectedCard.notes?.trim()
                              ? selectedCard.notes
                              : 'Handle with care. Ensure high quality print and accurate alignment.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                    <tr className="avoid-break">
                      <td colSpan={12} className="tax-cell align-top p-0">
                        <div className="tax-blue job-card-section-title text-center py-1 px-2">Attached File</div>
                        <div className="job-card-section-body p-2 flex flex-col items-center justify-center" style={{ minHeight: '60px' }}>
                          {selectedCard.jobAttachment && selectedCard.jobAttachment.dataUrl ? (
                            selectedCard.jobAttachment.type?.startsWith('image/') ? (
                              <img src={selectedCard.jobAttachment.dataUrl} alt="Attachment" style={{ maxWidth: '100%', maxHeight: '250px', objectFit: 'contain' }} />
                            ) : (
                              <div className="text-center">
                                <FileText size={32} className="mx-auto text-gray-400 mb-2" />
                                <p className="text-[10px] text-gray-600 truncate" style={{ maxWidth: '200px' }}>{selectedCard.jobAttachment.name}</p>
                              </div>
                            )
                          ) : (
                            <span className="text-[10px] text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td colSpan={6} className="tax-cell align-bottom text-center" style={{ height: '72px' }}>
                        <div className="pt-10">
                          <div className="border-t border-black mx-8 pt-1">
                            <span className="text-[10px] font-bold uppercase">Office Signature</span>
                          </div>
                        </div>
                      </td>
                      <td colSpan={6} className="tax-cell align-bottom text-center" style={{ height: '72px' }}>
                        <div className="pt-10">
                          <div className="border-t border-black mx-8 pt-1">
                            <span className="text-[10px] font-bold uppercase">Press Signature</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t bg-white flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 modal-footer no-print sticky bottom-0 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
              <button
                onClick={closePreview}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handlePrint}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 sm:py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-colors rounded-lg"
              >
                <Printer size={16} /> Print
              </button>
              <button
                onClick={handleSharePDF}
                disabled={isGenerating}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 sm:py-2 text-sm font-medium text-white transition-all rounded-lg ${isGenerating ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Share2 size={16} /> Share
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Are you sure?"
        message="Are you sure you want to move to trash?"
      />

      {/* Step Confirmation Modal */}
      {stepConfirm && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-zoom-in overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-gray-900">Confirm Action</h3>
                <button onClick={cancelStepClick} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                  <X size={18} />
                </button>
              </div>
              <p className="text-gray-600 mb-6 text-sm">
                Are you sure you want to change the status of this workflow step?
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={cancelStepClick} className="px-5 py-2 text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-all active:scale-95">
                  Cancel
                </button>
                <button onClick={executeStepClick} className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md shadow-blue-100 transition-all duration-200 active:scale-95 flex items-center gap-1.5">
                  <Check size={16} /> Yes, Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Image Required Alert Modal */}
      {imageBlockAlert && (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-amber-50 px-5 pt-5 pb-3 border-b border-amber-100 flex items-start gap-3">
              <div className="mt-0.5 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <span className="text-amber-600 text-lg font-black">!</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Image Required</h3>
                <p className="text-sm text-amber-700 mt-1">Please upload a proof image before marking <strong>QC &amp; Delivery</strong> as done.</p>
              </div>
            </div>
            <div className="p-4 flex justify-end">
              <button
                onClick={() => setImageBlockAlert(false)}
                className="px-6 py-2 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-all active:scale-95"
              >
                OK, Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paper Incomplete Alert Modal */}
      {paperBlockAlert && (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-amber-50 px-5 pt-5 pb-3 border-b border-amber-100 flex items-start gap-3">
              <div className="mt-0.5 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <span className="text-amber-600 text-lg font-black">!</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Paper Usage Incomplete</h3>
                <p className="text-sm text-amber-700 mt-1">Please mark <strong>Paper Usage</strong> as complete before moving to <strong>Binding &amp; Finish</strong>.</p>
              </div>
            </div>
            <div className="p-4 flex justify-end">
              <button
                onClick={() => setPaperBlockAlert(false)}
                className="px-6 py-2 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-all active:scale-95"
              >
                OK, Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paper Usage Modal */}
      {paperUsageModalCard && (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                Paper Usage Status
              </h3>
              <button
                onClick={() => setPaperUsageModalCard(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto grow">
              {(() => {
                const cardKey = getCardKey(paperUsageModalCard);
                const totalUnits = parseInt(paperUsageModalCard.jobQty) || 0;
                const data = JSON.parse(localStorage.getItem(`krishnaJobPaperUsage_${cardKey}`) || '[]');
                const usedUnits = data.reduce((acc, curr) => acc + curr.qty, 0);
                const remainingUnits = Math.max(0, totalUnits - usedUnits);
                const isComplete = totalUnits > 0 && usedUnits >= totalUnits;

                return (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-6">
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center shadow-inner">
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Total Units</p>
                        <p className="text-xl font-black text-gray-900 mt-1">{totalUnits.toLocaleString()}</p>
                      </div>
                      <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-center shadow-inner">
                        <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wide">Used</p>
                        <p className="text-xl font-black text-gray-900 mt-1">{usedUnits.toLocaleString()}</p>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center shadow-inner">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Remaining</p>
                        <p className="text-xl font-black text-gray-900 mt-1">{remainingUnits.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="mb-6 flex gap-2">
                      <input 
                        type="number"
                        placeholder="Qty Used..."
                        value={paperUsageInput}
                        onChange={(e) => setPaperUsageInput(e.target.value)}
                        disabled={isComplete}
                        className={`flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm ${isComplete ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      <button 
                        onClick={handleAddPaperUsage}
                        disabled={isComplete}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${isComplete ? 'bg-gray-400 cursor-not-allowed text-white shadow-none opacity-60' : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95 shadow-md shadow-blue-100'}`}
                      >
                        <Pencil size={14} /> Update
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      Usage History
                    </h4>
                    <div className="space-y-2 mb-6">
                      {data.length === 0 ? (
                        <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded-xl border border-gray-100">No usage recorded yet.</p>
                      ) : (
                        data.map((entry, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-gray-200 transition-colors">
                            <div>
                              <span className="font-black text-rose-600 text-sm block">-{entry.qty.toLocaleString()} units</span>
                              {entry.userName && (
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mt-1">
                                  By {entry.userName}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 font-medium bg-gray-50 px-2 py-1 rounded-md">{new Date(entry.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="border-t border-gray-100 pt-4 text-center">
                      <p className="text-xs text-gray-500 font-medium">
                        Status is automatically marked complete when used quantity meets or exceeds total units.
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
