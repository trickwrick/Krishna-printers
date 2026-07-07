import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { X, Printer, UserPlus, Plus, Trash2 } from 'lucide-react';
import { buildPartySuggestions, partyNameExists } from './utils/partySuggestions';
import { masterItemToLineFields } from './utils/itemSuggestions';
import ItemDescriptionInput from './components/ItemDescriptionInput';
import { useMasterItemsAutoSave } from './hooks/useMasterItemsAutoSave';
import PaymentTypeSection from './components/PaymentTypeSection';
import { usePaymentTypes } from './utils/usePaymentTypes';
import { getStoredPaymentType, setStoredPaymentType } from './utils/paymentTypeStorage';
import { setStoredDocumentExtras, getStoredDocumentExtras } from './utils/documentExtrasStorage';
import { setStoredItemNotes, mapLineItemsForSave } from './utils/itemNoteStorage';
import { validateStateAndCode } from './utils/indianStateCodes';
import { API_BASE_URL } from './utils/apiBase';

const EMPTY_PARTY_FORM = {
  partyName: '',
  address: '',
  contactNo: '',
  emailId: '',
  gstNo: '',
};

const parseJobQty = (value) => {
  const match = String(value || '').match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
};

const itemFromJobCard = (card) => ({
  description: `${card.jobName || 'Job'} (${card.jobNumber || ''})`.trim(),
  qty: parseJobQty(card.jobQty),
  rate: 0,
  per: 'PCS',
  gstPercent: 18,
  total: 0,
  gstAmount: 0,
  jobCardId: card._id || card.id,
  jobNumber: card.jobNumber || '',
});

const defaultItem = () => ({
  description: '',
  descriptionNote: '',
  qty: 0,
  rate: 0,
  per: 'PCS',
  gstPercent: 18,
  total: 0,
  gstAmount: 0,
});

const backfillItemForEdit = (item, editData) => {
  const total = Number(item.total) || 0;
  let qty = Number(item.qty) || 0;
  let rate = Number(item.rate) || 0;
  if (total > 0 && qty === 0 && rate === 0) {
    qty = 1;
    rate = total;
  }
  return {
    description: item.description || '',
    descriptionNote: item.descriptionNote || '',
    qty,
    rate,
    per: item.per ?? 'PCS',
    gstPercent: item.gstPercent ?? editData?.gstPercent ?? 18,
    total,
    gstAmount: item.gstAmount || 0,
    jobNumber: item.jobNumber || '',
  };
};

const normalizeItems = (editData) => {
  if (editData?.items?.length) {
    return editData.items.map((item) => backfillItemForEdit(item, editData));
  }
  if (editData?.description) {
    return [backfillItemForEdit({
      description: editData.description,
      qty: editData.qty,
      rate: editData.rate,
      gstPercent: editData.gstPercent,
      total: editData.total,
      gstAmount: 0,
    }, editData)];
  }
  return [defaultItem()];
};

const calcItemTotals = (item) => {
  const qty = parseFloat(item.qty || 0);
  const rate = parseFloat(item.rate || 0);
  const gstPercent = parseFloat(item.gstPercent ?? 18);
  const lineTotal = qty * rate;
  const gstAmount = (lineTotal * gstPercent) / 100;
  return {
    ...item,
    qty,
    rate,
    gstPercent,
    total: lineTotal,
    gstAmount,
  };
};

const AddChallan = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData;
  const storedExtras = getStoredDocumentExtras(editData?._id, editData?.challanNo);

  const [jobCards, setJobCards] = useState([]);
  const [pickedJobIds, setPickedJobIds] = useState([]);
  const [masterItems, setMasterItems] = useState([]);
  const [createJobCard, setCreateJobCard] = useState(false);
  const [newJobCardName, setNewJobCardName] = useState('');
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
  const [partyForm, setPartyForm] = useState(EMPTY_PARTY_FORM);
  const [isSavingParty, setIsSavingParty] = useState(false);
  const [isSavingChallan, setIsSavingChallan] = useState(false);
  const [stateFieldError, setStateFieldError] = useState('');
  const partyDropdownRef = useRef(null);
  const [challanDate, setChallanDate] = useState(editData ? new Date(editData.date) : new Date());
  const [formData, setFormData] = useState({
    challanNo: editData ? editData.challanNo : 'CHLN' + String(Date.now()).slice(-4),
    jobCardId: editData ? editData.jobCardId : '',
    partyName: editData ? editData.partyName : '',
    partyAddress: editData?.partyAddress || '',
    partyContact: editData?.partyContact || '',
    partyEmail: editData?.partyEmail || '',
    partyGst: editData?.partyGst || '',
    items: normalizeItems(editData),
    total: editData ? editData.total : 0,
    gstAmount: editData ? (editData.gstAmount || 0) : 0,
    grandTotal: editData ? (editData.grandTotal || editData.total || 0) : 0,
    freight: editData ? (editData.freight ?? storedExtras?.freight ?? 0) : 0,
    gstType: editData ? (editData.gstType || 'CGST/SGST') : 'CGST/SGST',
    reverseCharge: editData ? (editData.reverseCharge || 'No') : 'No',
    note: editData ? editData.note : '',
    paymentType: editData?.paymentType || getStoredPaymentType(editData?._id, editData?.challanNo) || '',
    vehicleNo: editData?.vehicleNo || storedExtras?.vehicleNo || '',
    state: editData?.state || storedExtras?.state || 'Rajasthan',
    stateCode: editData?.stateCode || storedExtras?.stateCode || '08',
  });

  const { paymentTypes, loading: paymentTypesLoading } = usePaymentTypes();

  const totals = useMemo(() => {
    const items = formData.items.map(calcItemTotals);
    const subTotal = items.reduce((sum, item) => sum + item.total, 0);
    const itemsGst = items.reduce((sum, item) => sum + item.gstAmount, 0);
    const freight = Number(formData.freight) || 0;
    const freightGstPercent = items[0]?.gstPercent ?? 18;
    const freightGst = (freight * freightGstPercent) / 100;
    const gstAmount = itemsGst + freightGst;
    const halfGst = gstAmount / 2;
    const rawGrandTotal = subTotal + freight + gstAmount;
    const grandTotal = Math.round(rawGrandTotal);
    const roundOff = grandTotal - rawGrandTotal;
    return { items, subTotal, freight, gstAmount, halfGst, grandTotal, roundOff };
  }, [formData.items, formData.freight]);

  useMasterItemsAutoSave(totals.items, masterItems, setMasterItems, API_BASE_URL);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/jobcard`)
      .then(res => res.json())
      .then(data => setJobCards(data))
      .catch(err => console.error("Error fetching Job Cards:", err));

    fetch(`${API_BASE_URL}/api/items`)
      .then(res => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data.filter((item) => item.isActive !== false) : [];
        setMasterItems(list);
      })
      .catch(err => console.error('Error fetching items:', err));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(event.target)) {
        setIsPartyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const partySuggestions = useMemo(() => buildPartySuggestions(jobCards), [jobCards]);

  const filteredJobCards = useMemo(() => {
    if (!formData.partyName.trim()) return jobCards;
    const party = formData.partyName.trim().toLowerCase();
    return jobCards.filter((card) => card.partyName?.toLowerCase().includes(party));
  }, [jobCards, formData.partyName]);

  const filteredPartySuggestions = partySuggestions.filter((party) => {
    const query = formData.partyName.trim().toLowerCase();
    if (!query) return true;
    return party.partyName.toLowerCase().includes(query);
  }).slice(0, 8);

  const showAddPartyButton = formData.partyName.trim().length > 0
    && !partyNameExists(partySuggestions, formData.partyName);

  const handleInputChange = (e) => {
    const { name, value: rawValue } = e.target;
    const value = name === 'stateCode' ? rawValue.replace(/\D/g, '').slice(0, 2) : rawValue;
    if (name === 'jobCardId') {
      const selectedCard = jobCards.find((card) => card._id === value || card.id === parseInt(value, 10));
      setPickedJobIds([]);
      setFormData((prev) => ({
        ...prev,
        jobCardId: value,
        partyName: selectedCard?.partyName || prev.partyName,
        items: selectedCard ? [itemFromJobCard(selectedCard)] : prev.items,
      }));
      return;
    }
    if (name === 'partyName') {
      setPickedJobIds([]);
      setFormData((prev) => ({ ...prev, partyName: value, jobCardId: '' }));
      setIsPartyDropdownOpen(true);
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'state' || name === 'stateCode') {
      setStateFieldError('');
    }
  };

  const runStateValidation = () => {
    const result = validateStateAndCode(formData.state, formData.stateCode);
    if (!result.valid) {
      setStateFieldError(result.message);
      alert(result.message);
      return false;
    }
    setStateFieldError('');
    return true;
  };

  const applyPartySuggestion = (party) => {
    setPickedJobIds([]);
    setFormData((prev) => ({
      ...prev,
      partyName: party.partyName,
      partyAddress: party.address || prev.partyAddress,
      partyContact: party.contactNo || prev.partyContact,
      partyEmail: party.emailId || prev.partyEmail,
      partyGst: party.gstNo || prev.partyGst,
      jobCardId: '',
    }));
    setIsPartyDropdownOpen(false);
  };

  const openAddPartyModal = () => {
    setPartyForm({
      ...EMPTY_PARTY_FORM,
      partyName: formData.partyName.trim(),
    });
    setIsAddPartyModalOpen(true);
    setIsPartyDropdownOpen(false);
  };

  const handlePartyFormChange = (e) => {
    const { name, value } = e.target;
    setPartyForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddPartySave = async (e) => {
    e.preventDefault();
    if (!partyForm.partyName.trim()) {
      alert('Party name is required');
      return;
    }

    setIsSavingParty(true);
    try {
      const partyName = partyForm.partyName.trim();
      const partySnapshot = {
        partyName,
        partyAddress: partyForm.address.trim(),
        partyContact: partyForm.contactNo.trim(),
        partyEmail: partyForm.emailId.trim(),
        partyGst: partyForm.gstNo.trim(),
      };

      setFormData((prev) => ({ ...prev, ...partySnapshot }));

      setIsAddPartyModalOpen(false);
      setPartyForm(EMPTY_PARTY_FORM);
    } catch (err) {
      console.error('Error saving party:', err);
      alert(err.message || 'Failed to add party');
    } finally {
      setIsSavingParty(false);
    }
  };

  const toggleJobPick = (id) => {
    setPickedJobIds((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ));
  };

  const addSelectedJobsToItems = () => {
    const picked = filteredJobCards.filter((card) => pickedJobIds.includes(card._id || card.id));
    if (!picked.length) return;

    const newItems = picked.map(itemFromJobCard);
    const existingDescs = new Set(formData.items.map((i) => i.description).filter(Boolean));
    const toAdd = newItems.filter((i) => !existingDescs.has(i.description));

    setFormData((prev) => {
      const hasContent = prev.items.some((i) => i.description || i.qty || i.rate);
      const merged = hasContent ? [...prev.items, ...toAdd] : (toAdd.length ? toAdd : [defaultItem()]);
      return {
        ...prev,
        items: merged,
        jobCardId: prev.jobCardId || (picked[0]._id || picked[0].id),
      };
    });
    setPickedJobIds([]);
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = value;
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const applyMasterItemToRow = (index, masterItem) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = calcItemTotals({
      ...updatedItems[index],
      ...masterItemToLineFields(masterItem, {
        includeHsn: false,
        currentQty: updatedItems[index].qty,
        existingNote: updatedItems[index].descriptionNote,
      }),
    });
    setFormData((prev) => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, defaultItem()]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length <= 1) return;
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const createJobCardEntry = async () => {
    const firstItem = totals.items[0];
    const response = await fetch(`${API_BASE_URL}/api/jobcard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partyName: formData.partyName.trim(),
        companyName: formData.partyName.trim(),
        address: formData.partyAddress,
        contactNo: formData.partyContact,
        emailId: formData.partyEmail,
        gstNo: formData.partyGst,
        jobName: newJobCardName.trim() || firstItem?.description?.trim() || 'Direct Challan',
        jobDate: challanDate.toISOString(),
        jobQty: String(firstItem?.qty || 1),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create job card');
    }

    const savedJobCard = await response.json();
    setJobCards((prev) => [savedJobCard, ...prev]);
    return savedJobCard;
  };

  const buildChallanPayload = (linkedJobCard = null) => {
    const selectedCard = linkedJobCard
      || jobCards.find((card) => card._id === formData.jobCardId || card.id === parseInt(formData.jobCardId, 10));
    const jobNumbersFromItems = [...new Set(
      formData.items
        .map(i => i.jobNumber || (i.description?.match(/\((JOB[^)]+)\)/)?.[1]))
        .filter(Boolean)
    )];
    const computedItems = formData.items.map(calcItemTotals);
    const invoiceGstPercent = computedItems.length
      ? Math.round(computedItems.reduce((sum, item) => sum + item.gstPercent, 0) / computedItems.length)
      : 18;

    return {
      challanNo: formData.challanNo,
      date: challanDate.toISOString(),
      jobCardId: linkedJobCard?._id || linkedJobCard?.id || formData.jobCardId || undefined,
      jobNumber: jobNumbersFromItems.length ? jobNumbersFromItems.join(', ') : (selectedCard?.jobNumber || ''),
      jobName: selectedCard?.jobName || '',
      partyName: formData.partyName,
      partyAddress: formData.partyAddress,
      partyContact: formData.partyContact,
      partyEmail: formData.partyEmail,
      partyGst: formData.partyGst,
      items: mapLineItemsForSave(computedItems),
      total: totals.subTotal,
      freight: totals.freight,
      gstPercent: invoiceGstPercent,
      gstType: formData.gstType,
      reverseCharge: formData.reverseCharge,
      gstAmount: totals.gstAmount,
      grandTotal: totals.grandTotal,
      note: formData.note,
      description: computedItems.length > 0 ? computedItems[0].description : '',
      qty: computedItems.length > 0 ? computedItems[0].qty : 0,
      rate: computedItems.length > 0 ? computedItems[0].rate : 0,
      paymentStatus: editData ? (editData.paymentStatus || 'Pending') : 'Pending',
      paymentType: formData.paymentType || '',
      vehicleNo: formData.vehicleNo || '',
      state: formData.state || 'Rajasthan',
      stateCode: formData.stateCode || '08',
    };
  };

  const saveChallan = async () => {
    let linkedJobCard = null;
    if (createJobCard) {
      linkedJobCard = await createJobCardEntry();
    }

    const response = await fetch(`${API_BASE_URL}/api/challan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildChallanPayload(linkedJobCard)),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to save challan');
    }

    const saved = await response.json();
    const paymentType = saved.paymentType || formData.paymentType || '';
    setStoredPaymentType(saved._id, saved.challanNo, paymentType);
    const extras = {
      vehicleNo: saved.vehicleNo || formData.vehicleNo || '',
      state: saved.state || formData.state || 'Rajasthan',
      stateCode: saved.stateCode || formData.stateCode || '08',
      freight: Number(saved.freight) || Number(formData.freight) || 0,
    };
    setStoredDocumentExtras(saved._id, saved.challanNo, extras);
    const savedItems = mapLineItemsForSave(formData.items.map(calcItemTotals)).map((item, index) => ({
      ...item,
      descriptionNote: formData.items[index]?.descriptionNote || item.descriptionNote || '',
    }));
    setStoredItemNotes(saved._id, saved.challanNo, savedItems);
    return {
      ...saved,
      paymentType,
      ...extras,
      freight: extras.freight,
      items: savedItems,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.partyName.trim()) {
      alert('Party name is required');
      return;
    }
    if (!runStateValidation()) return;

    setIsSavingChallan(true);
    try {
      await saveChallan();
      navigate('/challan/list');
    } catch (err) {
      console.error('Error saving challan:', err);
      alert(err.message || 'Failed to save challan. Is server running?');
    } finally {
      setIsSavingChallan(false);
    }
  };

  const handleSaveAndPrint = async () => {
    if (!formData.partyName.trim()) {
      alert('Party name is required');
      return;
    }
    if (!runStateValidation()) return;

    setIsSavingChallan(true);
    try {
      const saved = await saveChallan();
      navigate('/challan/list', {
        state: { printChallanId: saved._id, printDoc: saved },
      });
    } catch (err) {
      console.error('Error saving challan:', err);
      alert(err.message || 'Failed to save challan. Is server running?');
    } finally {
      setIsSavingChallan(false);
    }
  };

  return (
    <div className="mx-auto mt-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 group flex items-center gap-3">
            <div className="bg-blue-600 w-1.5 h-6 rounded-full" />
            Manage Challan
          </h1>
        </div>
        <div className="text-sm text-gray-500 font-medium">
          Challan &gt; <span className="text-blue-600">{editData ? 'Edit Challan' : 'Add Challan'}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
          <div className="bg-blue-900 text-white px-6 py-2 w-fit relative font-semibold text-xs sm:text-sm rounded-br-2xl">
            Basic Details
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">Challan No *</label>
              <input
                type="text"
                name="challanNo"
                value={formData.challanNo}
                onChange={handleInputChange}
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">Date *</label>
              <DatePicker
                selected={challanDate}
                onChange={(date) => setChallanDate(date)}
                wrapperClassName="w-full"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">Vehicle No.</label>
              <input
                type="text"
                name="vehicleNo"
                value={formData.vehicleNo}
                onChange={handleInputChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                placeholder="Vehicle number"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                onBlur={() => {
                  const result = validateStateAndCode(formData.state, formData.stateCode);
                  setStateFieldError(result.valid ? '' : result.message);
                }}
                className={`w-full bg-gray-50 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 transition-all text-sm ${
                  stateFieldError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500'
                }`}
                placeholder="Rajasthan"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">State Code</label>
              <input
                type="text"
                name="stateCode"
                value={formData.stateCode}
                onChange={handleInputChange}
                onBlur={() => {
                  const result = validateStateAndCode(formData.state, formData.stateCode);
                  setStateFieldError(result.valid ? '' : result.message);
                }}
                inputMode="numeric"
                maxLength={2}
                className={`w-full bg-gray-50 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 transition-all text-sm ${
                  stateFieldError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500'
                }`}
                placeholder="08"
              />
              {stateFieldError && (
                <p className="text-xs text-red-600 whitespace-pre-line">{stateFieldError}</p>
              )}
            </div>
            <div className="space-y-1 relative z-20" ref={partyDropdownRef}>
              <label className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">Party *</label>
              <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                  <input
                    type="text"
                    name="partyName"
                    value={formData.partyName}
                    onChange={handleInputChange}
                    onFocus={() => setIsPartyDropdownOpen(true)}
                    onBlur={() => {
                      const match = partySuggestions.find(
                        (party) => party.partyName.toLowerCase() === formData.partyName.trim().toLowerCase()
                      );
                      if (match) applyPartySuggestion(match);
                    }}
                    required
                    placeholder="Type party name..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                  />
                  {isPartyDropdownOpen && filteredPartySuggestions.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full min-w-[220px] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                        Existing parties
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredPartySuggestions.map((party) => (
                          <button
                            key={party.partyName}
                            type="button"
                            onClick={() => applyPartySuggestion(party)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 text-gray-700"
                          >
                            <span className="font-semibold text-gray-900">{party.partyName}</span>
                            {party.address && (
                              <span className="block text-xs text-gray-400 mt-0.5 truncate">{party.address}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {showAddPartyButton && (
                  <button
                    type="button"
                    onClick={openAddPartyModal}
                    className="shrink-0 inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95"
                    title="Add new party"
                  >
                    <UserPlus size={16} />
                    Add
                  </button>
                )}
              </div>
              {showAddPartyButton && (
                <p className="text-[11px] text-emerald-700 font-semibold px-1">
                  New party — click Add
                </p>
              )}
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-800 whitespace-nowrap self-end pb-2.5">
              <input
                type="checkbox"
                checked={createJobCard}
                onChange={(e) => setCreateJobCard(e.target.checked)}
                className="rounded border-gray-400 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              Create Job Card
            </label>
            {createJobCard && (
              <div className="space-y-1">
                <label className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">Job / Item Name</label>
                <input
                  type="text"
                  value={newJobCardName}
                  onChange={(e) => setNewJobCardName(e.target.value)}
                  placeholder={totals.items[0]?.description?.trim() || 'Uses first item description if blank'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                />
              </div>
            )}
          </div>

          <div className="px-4 sm:px-6 pb-2">
            <div className="space-y-1 max-w-xl">
              <label className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">Job Card</label>
              <select
                name="jobCardId"
                value={formData.jobCardId}
                onChange={handleInputChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              >
                <option value="">
                  {formData.partyName
                    ? `Select Job (${filteredJobCards.length} found)`
                    : 'Select party first'}
                </option>
                {filteredJobCards.map((card) => (
                  <option key={card._id || card.id} value={card._id || card.id}>
                    ({card.jobNumber}) {card.jobName} - {card.partyName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formData.partyName && filteredJobCards.length > 0 && (
            <div className="px-4 sm:px-6 pb-4 border-t border-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 mt-4">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Multiple Jobs — select and add to items ({filteredJobCards.length} found)
                </p>
                <button
                  type="button"
                  onClick={() => setPickedJobIds(filteredJobCards.map((c) => c._id || c.id))}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold self-start"
                >
                  Select All
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 mb-3 bg-gray-50">
                {filteredJobCards.map((card) => {
                  const id = card._id || card.id;
                  return (
                    <label key={id} className="flex items-start gap-3 p-3 hover:bg-white cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={pickedJobIds.includes(id)}
                        onChange={() => toggleJobPick(id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-800 leading-snug">
                        <span className="font-semibold text-blue-700">({card.jobNumber})</span> {card.jobName}
                      </span>
                    </label>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={addSelectedJobsToItems}
                disabled={pickedJobIds.length === 0}
                className="w-full sm:w-auto text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Add Selected to Items ({pickedJobIds.length})
              </button>
            </div>
          )}
        </div>

        {/* Items Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
          <div className="bg-blue-900 text-white px-6 py-2 w-fit relative font-semibold text-xs sm:text-sm rounded-br-2xl">
            Item Details
          </div>
          <div className="overflow-x-auto overflow-y-visible -mx-1 px-1">
            <table className="crm-items-table w-full text-left border-collapse min-w-[880px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider w-56">Description *</th>
                  <th className="px-6 py-3 text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider text-center w-24">Qty *</th>
                  <th className="px-6 py-3 text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider text-center w-28">Rate *</th>
                  <th className="px-6 py-3 text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider text-center w-20">per</th>
                  <th className="px-6 py-3 text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider text-center w-24">GST %</th>
                  <th className="px-6 py-3 text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider text-center w-32">Amount</th>
                  <th className="px-6 py-3 w-14"></th>
                </tr>
              </thead>
              <tbody>
                {totals.items.map((item, index) => (
                  <tr key={index} className="border-t border-gray-100 group">
                    <td className="px-6 py-4">
                      <ItemDescriptionInput
                        value={item.description}
                        note={formData.items[index]?.descriptionNote || ''}
                        onChange={(value) => handleItemChange(index, 'description', value)}
                        onNoteChange={(value) => handleItemChange(index, 'descriptionNote', value)}
                        onSelectMaster={(masterItem) => applyMasterItemToRow(index, masterItem)}
                        masterItems={masterItems}
                        required
                      />
                    </td>
                    <td className="px-2 py-4 text-center">
                      <div className="flex justify-center">
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                          required
                          min="0"
                          step="any"
                          className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm text-center"
                        />
                      </div>
                    </td>
                    <td className="px-2 py-4 text-center">
                      <div className="flex justify-center">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                          required
                          min="0"
                          step="any"
                          className="w-24 bg-white border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm text-center"
                        />
                      </div>
                    </td>
                    <td className="px-2 py-4 text-center">
                      <div className="flex justify-center">
                        <input
                          type="text"
                          value={item.per ?? ''}
                          onChange={(e) => handleItemChange(index, 'per', e.target.value)}
                          placeholder="PCS"
                          className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm text-center uppercase"
                        />
                      </div>
                    </td>
                    <td className="px-2 py-4 text-center">
                      <div className="flex justify-center">
                        <input
                          type="number"
                          value={item.gstPercent}
                          onChange={(e) => handleItemChange(index, 'gstPercent', e.target.value)}
                          min="0"
                          step="any"
                          className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm text-center"
                        />
                      </div>
                    </td>
                    <td className="px-2 py-4 text-center">
                      <div className="flex justify-center">
                        <input
                          type="text"
                          value={Number(item.total || 0).toFixed(2)}
                          readOnly
                          className="w-28 bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 focus:outline-none text-sm text-center font-semibold text-blue-700"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all opacity-100"
                        title="Remove row"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 flex justify-end bg-gray-50/50">
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95"
            >
              <Plus size={16} /> Add Row
            </button>
          </div>
        </div>

        <PaymentTypeSection
          value={formData.paymentType}
          onChange={(value) => setFormData((prev) => ({ ...prev, paymentType: value }))}
          paymentTypes={paymentTypes}
          loading={paymentTypesLoading}
        />

        {/* Calculations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-2">
            <label className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">Sub Total *</label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-base sm:text-lg font-semibold text-gray-800">
              ₹ {totals.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-2">
            <label className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">Freight</label>
            <input
              type="number"
              name="freight"
              min="0"
              step="0.01"
              value={formData.freight}
              onChange={handleInputChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-base sm:text-lg font-semibold text-gray-800"
              placeholder="0.00"
            />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-2">
            <label className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">GST Amount</label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-base sm:text-lg font-semibold text-gray-800">
              ₹ {totals.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-2">
            <label className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">GST Type *</label>
            <select
              name="gstType"
              value={formData.gstType}
              onChange={handleInputChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-base sm:text-lg font-semibold text-gray-800 outline-none cursor-pointer"
            >
              <option value="CGST/SGST">CGST + SGST</option>
              <option value="IGST">IGST</option>
            </select>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-2">
            <label className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">Reverse Charge</label>
            <select
              name="reverseCharge"
              value={formData.reverseCharge}
              onChange={handleInputChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-base sm:text-lg font-semibold text-gray-800 outline-none cursor-pointer"
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-2 sm:col-span-2 lg:col-span-1">
            <label className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">Grand Total</label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-base sm:text-lg font-bold text-blue-600">
              ₹ {totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-2">
          <label className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">Note</label>
          <textarea
            name="note"
            value={formData.note}
            onChange={handleInputChange}
            rows="2"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            placeholder="Enter additional notes..."
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={handleSaveAndPrint}
            disabled={isSavingChallan}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-8 py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <Printer size={18} />
            {isSavingChallan ? 'Saving...' : 'Save & Print'}
          </button>
          <button
            type="submit"
            disabled={isSavingChallan}
            className="w-full sm:w-auto bg-blue-800 hover:bg-blue-900 disabled:opacity-60 text-white px-10 py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            {isSavingChallan ? 'Saving...' : (editData ? 'Update Challan' : 'Save Challan')}
          </button>
        </div>
      </form>

      {isAddPartyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-gray-100 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Add New Party</h2>
                <p className="text-sm text-gray-500">Basic details for challan printing</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPartyModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddPartySave} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Party Name *</label>
                <input
                  type="text"
                  name="partyName"
                  value={partyForm.partyName}
                  onChange={handlePartyFormChange}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Address</label>
                <input
                  type="text"
                  name="address"
                  value={partyForm.address}
                  onChange={handlePartyFormChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Contact No</label>
                  <input
                    type="text"
                    name="contactNo"
                    value={partyForm.contactNo}
                    onChange={handlePartyFormChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">GST No</label>
                  <input
                    type="text"
                    name="gstNo"
                    value={partyForm.gstNo}
                    onChange={handlePartyFormChange}
                    placeholder="URP if unregistered"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  name="emailId"
                  value={partyForm.emailId}
                  onChange={handlePartyFormChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPartyModalOpen(false)}
                  className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingParty}
                  className="px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-bold text-sm"
                >
                  {isSavingParty ? 'Saving...' : 'Save Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddChallan;
