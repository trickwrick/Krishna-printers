import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { Plus, Trash2, X, Printer, UserPlus } from 'lucide-react';
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

const defaultInvoiceItem = () => ({
  id: Date.now() + Math.random(),
  description: '',
  descriptionNote: '',
  hsn: '',
  qty: 0,
  rate: 0,
  per: 'PCS',
  gstPercent: 18,
  total: 0,
  gstAmount: 0,
});

const calcInvoiceItem = (item, fallbackGst = 18) => {
  const qty = parseFloat(item.qty || 0);
  const rate = parseFloat(item.rate || 0);
  const gstPercent = parseFloat(item.gstPercent ?? fallbackGst);
  const total = qty * rate;
  const gstAmount = (total * gstPercent) / 100;
  return { ...item, qty, rate, gstPercent, total, gstAmount };
};

const normalizeInvoiceItems = (editData) => {
  if (editData?.items?.length) {
    return editData.items.map((item) => calcInvoiceItem({
      ...item,
      id: item.id || item._id || Date.now() + Math.random(),
      descriptionNote: item.descriptionNote || '',
      hsn: item.hsn || '',
      per: item.per ?? 'PCS',
      gstPercent: item.gstPercent ?? editData.gstPercent ?? 18,
    }, editData.gstPercent ?? 18));
  }
  return [defaultInvoiceItem()];
};

const AddInvoice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData;
  const storedExtras = getStoredDocumentExtras(editData?._id, editData?.invoiceNumber);

  const [invoiceDate, setInvoiceDate] = useState(editData ? new Date(editData.date) : new Date());
  const [orderDate, setOrderDate] = useState(
    editData?.orderDate ? new Date(editData.orderDate) : (editData?.date ? new Date(editData.date) : new Date())
  );
  const [jobCards, setJobCards] = useState([]);
  const [createJobCard, setCreateJobCard] = useState(false);
  const [newJobCardName, setNewJobCardName] = useState('');
  const [formData, setFormData] = useState({
    invoiceNo: editData ? editData.invoiceNumber : 'INVN' + String(Date.now()).slice(-4),
    jobCard: editData ? editData.jobCard : '',
    orderNo: editData ? (editData.orderNo || editData.jobCard || '') : '',
    party: editData ? editData.partyName : '',
    partyAddress: editData?.partyAddress || '',
    partyContact: editData?.partyContact || '',
    partyEmail: editData?.partyEmail || '',
    partyGst: editData?.partyGst || '',
    gstType: editData ? (editData.gstType || 'CGST/SGST') : 'CGST/SGST',
    freight: editData ? (editData.freight ?? storedExtras?.freight ?? 0) : 0,
    reverseCharge: editData ? (editData.reverseCharge || 'No') : 'No',
    paymentType: editData?.paymentType || getStoredPaymentType(editData?._id, editData?.invoiceNumber) || '',
    vehicleNo: editData?.vehicleNo || storedExtras?.vehicleNo || '',
    state: editData?.state || storedExtras?.state || 'Rajasthan',
    stateCode: editData?.stateCode || storedExtras?.stateCode || '08',
  });

  const [items, setItems] = useState(() => normalizeInvoiceItems(editData));
  const [masterItems, setMasterItems] = useState([]);
  const { paymentTypes, loading: paymentTypesLoading } = usePaymentTypes();

  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
  const [partyForm, setPartyForm] = useState(EMPTY_PARTY_FORM);
  const [isSavingParty, setIsSavingParty] = useState(false);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [stateFieldError, setStateFieldError] = useState('');
  const partyDropdownRef = useRef(null);

  const partySuggestions = useMemo(() => buildPartySuggestions(jobCards), [jobCards]);

  const filteredPartySuggestions = partySuggestions.filter((party) => {
    const query = formData.party.trim().toLowerCase();
    if (!query) return true;
    return party.partyName.toLowerCase().includes(query);
  }).slice(0, 8);

  const showAddPartyButton = formData.party.trim().length > 0
    && !partyNameExists(partySuggestions, formData.party);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(event.target)) {
        setIsPartyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleInputChange = (e) => {
    const { name, value: rawValue } = e.target;
    const value = name === 'stateCode' ? rawValue.replace(/\D/g, '').slice(0, 2) : rawValue;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'party') {
      setIsPartyDropdownOpen(true);
    }
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
    setFormData((prev) => ({
      ...prev,
      party: party.partyName,
      partyAddress: party.address || prev.partyAddress,
      partyContact: party.contactNo || prev.partyContact,
      partyEmail: party.emailId || prev.partyEmail,
      partyGst: party.gstNo || prev.partyGst,
    }));
    setIsPartyDropdownOpen(false);
  };

  const openAddPartyModal = () => {
    setPartyForm({
      ...EMPTY_PARTY_FORM,
      partyName: formData.party.trim(),
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
        party: partyName,
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

  const handleItemChange = (id, field, value) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== id) return item;
        return calcInvoiceItem({ ...item, [field]: value });
      })
    );
  };

  const applyMasterItemToRow = (id, masterItem) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== id) return item;
        return calcInvoiceItem({
          ...item,
          ...masterItemToLineFields(masterItem, {
            includeHsn: true,
            currentQty: item.qty,
            existingNote: item.descriptionNote,
          }),
        });
      })
    );
  };

  const addRow = () => {
    setItems((prev) => [...prev, defaultInvoiceItem()]);
  };

  const removeRow = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const computedItems = useMemo(() => items.map((item) => calcInvoiceItem(item)), [items]);

  useMasterItemsAutoSave(computedItems, masterItems, setMasterItems, API_BASE_URL);

  const subTotal = computedItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const itemsGstAmount = computedItems.reduce((sum, item) => sum + (item.gstAmount || 0), 0);
  const freight = Number(formData.freight) || 0;
  const freightGstPercent = computedItems[0]?.gstPercent ?? 18;
  const freightGstAmount = (freight * freightGstPercent) / 100;
  const gstAmount = itemsGstAmount + freightGstAmount;
  const grandTotal = subTotal + freight + gstAmount;
  const invoiceGstPercent = computedItems.length
    ? Math.round(computedItems.reduce((sum, item) => sum + item.gstPercent, 0) / computedItems.length)
    : 18;

  const createJobCardEntry = async () => {
    const firstItem = computedItems[0];
    const response = await fetch(`${API_BASE_URL}/api/jobcard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partyName: formData.party.trim(),
        companyName: formData.party.trim(),
        address: formData.partyAddress,
        contactNo: formData.partyContact,
        emailId: formData.partyEmail,
        gstNo: formData.partyGst,
        jobName: newJobCardName.trim() || firstItem?.description?.trim() || 'Direct Invoice',
        jobDate: invoiceDate.toISOString(),
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

  const buildInvoicePayload = (jobCardNumber = '') => ({
    invoiceNumber: formData.invoiceNo,
    date: invoiceDate.toISOString(),
    jobCard: jobCardNumber,
    orderNo: jobCardNumber || formData.orderNo,
    orderDate: orderDate.toISOString(),
    partyName: formData.party,
    partyAddress: formData.partyAddress,
    partyContact: formData.partyContact,
    partyEmail: formData.partyEmail,
    partyGst: formData.partyGst,
    items: mapLineItemsForSave(computedItems),
    subTotal,
    freight,
    reverseCharge: formData.reverseCharge || 'No',
    gstPercent: invoiceGstPercent,
    gstType: formData.gstType,
    gstAmount,
    totalAmount: grandTotal,
    paymentType: formData.paymentType || '',
    vehicleNo: formData.vehicleNo || '',
    state: formData.state || 'Rajasthan',
    stateCode: formData.stateCode || '08',
  });

  const saveInvoice = async () => {
    let jobCardNumber = formData.jobCard || '';
    if (createJobCard) {
      const savedJobCard = await createJobCardEntry();
      jobCardNumber = savedJobCard.jobNumber || '';
    }

    const response = await fetch(`${API_BASE_URL}/api/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildInvoicePayload(jobCardNumber)),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to save invoice');
    }

    const saved = await response.json();
    const paymentType = saved.paymentType || formData.paymentType || '';
    setStoredPaymentType(saved._id, saved.invoiceNumber, paymentType);
    const extras = {
      vehicleNo: saved.vehicleNo || formData.vehicleNo || '',
      state: saved.state || formData.state || 'Rajasthan',
      stateCode: saved.stateCode || formData.stateCode || '08',
      freight: Number(saved.freight) || Number(formData.freight) || 0,
    };
    setStoredDocumentExtras(saved._id, saved.invoiceNumber, extras);
    setStoredItemNotes(saved._id, saved.invoiceNumber, computedItems);
    const savedItems = mapLineItemsForSave(computedItems).map((item, index) => ({
      ...item,
      descriptionNote: computedItems[index]?.descriptionNote || item.descriptionNote || '',
    }));
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
    if (!formData.party.trim()) {
      alert('Party name is required');
      return;
    }
    if (!runStateValidation()) return;

    setIsSavingInvoice(true);
    try {
      await saveInvoice();
      navigate('/invoice/list');
    } catch (err) {
      console.error('Error saving invoice:', err);
      alert(err.message || 'Failed to save invoice. Is server running?');
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const handleSaveAndPrint = async () => {
    if (!formData.party.trim()) {
      alert('Party name is required');
      return;
    }
    if (!runStateValidation()) return;

    setIsSavingInvoice(true);
    try {
      const saved = await saveInvoice();
      navigate('/invoice/list', {
        state: { printInvoiceId: saved._id, printDoc: saved },
      });
    } catch (err) {
      console.error('Error saving invoice:', err);
      alert(err.message || 'Failed to save invoice. Is server running?');
    } finally {
      setIsSavingInvoice(false);
    }
  };

  return (
    <div className="mx-auto mt-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 group flex items-center gap-3">
            <div className="bg-blue-600 w-1.5 h-6 rounded-full" />
            Manage Invoice
          </h1>
        </div>
        <div className="text-sm text-gray-500 font-medium">
          Invoice &gt; <span className="text-blue-600">{editData ? 'Edit Invoice' : 'Add Invoice'}</span>
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
              <label className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">Invoice No *</label>
              <input
                type="text"
                name="invoiceNo"
                value={formData.invoiceNo}
                onChange={handleInputChange}
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">Date *</label>
              <DatePicker
                selected={invoiceDate}
                onChange={(date) => setInvoiceDate(date)}
                wrapperClassName="w-full"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">Order No.</label>
              <input
                type="text"
                name="orderNo"
                value={formData.orderNo}
                onChange={handleInputChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                placeholder="Order number"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">Order Date</label>
              <DatePicker
                selected={orderDate}
                onChange={(date) => setOrderDate(date || new Date())}
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
                    name="party"
                    value={formData.party}
                    onChange={handleInputChange}
                    onFocus={() => setIsPartyDropdownOpen(true)}
                    onBlur={() => {
                      const match = partySuggestions.find(
                        (party) => party.partyName.toLowerCase() === formData.party.trim().toLowerCase()
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
                  placeholder={computedItems[0]?.description?.trim() || 'Uses first item description if blank'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
          <div className="bg-blue-900 text-white px-6 py-2 w-fit relative font-semibold text-xs sm:text-sm rounded-br-2xl">
            Item Details
          </div>
          <div className="overflow-x-auto overflow-y-visible -mx-1 px-1">
            <table className="crm-items-table w-full text-left border-collapse min-w-[980px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider w-56">Description *</th>
                  <th className="px-6 py-3 text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider w-40">HSN/SAC</th>
                  <th className="px-6 py-3 text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider text-center w-24">Qty *</th>
                  <th className="px-6 py-3 text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider text-center w-28">Rate *</th>
                  <th className="px-6 py-3 text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider text-center w-20">per</th>
                  <th className="px-6 py-3 text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider text-center w-24">GST %</th>
                  <th className="px-6 py-3 text-[10px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider text-center w-32">Amount</th>
                  <th className="px-6 py-3 w-14"></th>
                </tr>
              </thead>
              <tbody>
                {computedItems.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100 group">
                    <td className="px-6 py-4">
                      <ItemDescriptionInput
                        value={item.description}
                        note={item.descriptionNote || ''}
                        onChange={(value) => handleItemChange(item.id, 'description', value)}
                        onNoteChange={(value) => handleItemChange(item.id, 'descriptionNote', value)}
                        onSelectMaster={(masterItem) => applyMasterItemToRow(item.id, masterItem)}
                        masterItems={masterItems}
                        required
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={item.hsn || ''}
                        onChange={(e) => handleItemChange(item.id, 'hsn', e.target.value)}
                        placeholder="HSN/SAC"
                        className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                      />
                    </td>
                    <td className="px-2 py-4 text-center">
                      <div className="flex justify-center">
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                          required
                          className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm text-center"
                        />
                      </div>
                    </td>
                    <td className="px-2 py-4 text-center">
                      <div className="flex justify-center">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                          required
                          className="w-24 bg-white border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm text-center"
                        />
                      </div>
                    </td>
                    <td className="px-2 py-4 text-center">
                      <div className="flex justify-center">
                        <input
                          type="text"
                          value={item.per ?? ''}
                          onChange={(e) => handleItemChange(item.id, 'per', e.target.value)}
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
                          onChange={(e) => handleItemChange(item.id, 'gstPercent', e.target.value)}
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
                        onClick={() => removeRow(item.id)}
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
              onClick={addRow}
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
              ₹ {subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
              ₹ {gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
              ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={handleSaveAndPrint}
            disabled={isSavingInvoice}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-8 py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <Printer size={18} />
            {isSavingInvoice ? 'Saving...' : 'Save & Print'}
          </button>
          <button
            type="submit"
            disabled={isSavingInvoice}
            className="w-full sm:w-auto bg-blue-800 hover:bg-blue-900 disabled:opacity-60 text-white px-10 py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            {isSavingInvoice ? 'Saving...' : (editData ? 'Update Invoice' : 'Save Invoice')}
          </button>
        </div>
      </form>

      {isAddPartyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-gray-100 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Add New Party</h2>
                <p className="text-sm text-gray-500">Basic details for invoice printing</p>
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

export default AddInvoice;
