import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Trash2, MoreHorizontal, Truck, Pencil, ChevronDown, Check, AlertCircle, Printer, X, Download, Phone, Mail, Globe, Building2, MapPin, Calendar, FileDigit } from 'lucide-react';
import { downloadAsPDF } from './utils/pdfExport';
import { printElement } from './utils/printDocument';
import { mergePaymentType, mergePaymentTypeList, removeStoredPaymentType } from './utils/paymentTypeStorage';
import {
  mergeDocumentForPrint,
  mergeDocumentForPrintList,
  mergePrintDoc,
  removeStoredDocumentExtras,
} from './utils/documentExtrasStorage';
import { removeStoredItemNotes } from './utils/itemNoteStorage';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import { getBillToDetails, getShipToDetails } from './utils/shipAddress';
import { numberToWords } from './utils/numberToWords';
import { getChallanLineItems, computeLineItemsTotals, buildMergedChallanMeta } from './utils/challanTotals';
import { SELLER, fmtTaxDate, fmtAmt, getStateFromGst, formatStateWithCode, TaxFieldsTable, SellerGstinMsmeLines, TaxDocumentSignaturesRow, TaxTermsAndReceiverSignature, TaxBankAndAuthorisedSignature, buildTaxItemLine, getEmptyProductRowCount, CompanyBrandName, TaxCopyBox, TaxCopyTypeControls, DEFAULT_TAX_COPY_SELECTION, getSelectedCopyIds, getPreviewHighlightCopy, TaxInvoiceColGroup, getTaxTableColCount, getTaxTableHalfColSpans, getTaxChargeSubRowCount, TaxClassicItemsBlock, buildTaxAnalysisGroups, TaxAnalysisSection } from './utils/taxDocumentPrint';
import { API_BASE_URL } from './utils/apiBase';

const ChallanList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [challans, setChallans] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [challanToDelete, setChallanToDelete] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Printing states
  const [previewChallans, setPreviewChallans] = useState([]);
  const [selectedChallanIds, setSelectedChallanIds] = useState([]);
  const [partyFilter, setPartyFilter] = useState('');
  const [tempGstType, setTempGstType] = useState('CGST/SGST');
  const [copySelection, setCopySelection] = useState(DEFAULT_TAX_COPY_SELECTION);
  const isIGST = tempGstType === 'IGST';
  const taxColCount = getTaxTableColCount();
  const { left: taxHalfColSpan, right: taxHalfColSpanRight } = getTaxTableHalfColSpans();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobCards, setJobCards] = useState([]);

  const isMergedPrint = previewChallans.length > 1;
  const primaryChallan = previewChallans[0] || null;

  const challanItems = previewChallans.flatMap(getChallanLineItems);
  const { subTotal: totalAmount, freight: totalFreight, gstAmount: totalGstAmount, grandTotal } =
    computeLineItemsTotals(challanItems, primaryChallan?.gstPercent ?? 18, previewChallans);
  const mergedMeta = buildMergedChallanMeta(previewChallans);

  const linkedJobCard = primaryChallan
    ? jobCards.find((card) => card.jobNumber === primaryChallan.jobNumber)
    : null;

  const challanPartyFallback = primaryChallan ? { partyName: primaryChallan.partyName } : {};
  const billTo = getBillToDetails(linkedJobCard, challanPartyFallback);
  const shipTo = getShipToDetails(linkedJobCard, challanPartyFallback);
  const billToState = getStateFromGst(billTo.gstNo);
  const shipToState = getStateFromGst(shipTo.gstNo);

  const challanFallbackGst = primaryChallan?.gstPercent ?? 18;
  const freightGstPercent = challanItems[0]?.gstPercent ?? challanFallbackGst;
  const freightCgstAmt = isIGST ? 0 : (totalFreight * (freightGstPercent / 2)) / 100;
  const freightSgstAmt = isIGST ? 0 : (totalFreight * (freightGstPercent / 2)) / 100;
  const freightIgstAmt = isIGST ? (totalFreight * freightGstPercent) / 100 : 0;

  const itemLines = challanItems.map((item, idx) => buildTaxItemLine(item, idx, challanFallbackGst, isIGST));
  const totalTaxable = totalAmount + totalFreight;
  const totalCgst = itemLines.reduce((sum, row) => sum + row.cgstAmt, 0) + freightCgstAmt;
  const totalSgst = itemLines.reduce((sum, row) => sum + row.sgstAmt, 0) + freightSgstAmt;
  const totalIgst = itemLines.reduce((sum, row) => sum + row.igstAmt, 0) + freightIgstAmt;
  const amountBeforeTax = totalTaxable;
  const amountWithTax = grandTotal;
  const challanDate = mergedMeta.date || primaryChallan?.date || primaryChallan?.createdAt;
  const challanNoLabel = isMergedPrint ? mergedMeta.challanLabel : primaryChallan?.challanNo;
  const jobRefLabel = isMergedPrint ? mergedMeta.jobRefLabel : primaryChallan?.jobNumber;
  const emptyProductRows = getEmptyProductRowCount(
    itemLines.length + getTaxChargeSubRowCount(totalFreight, isIGST),
    { itemLineCount: itemLines.length },
  );
  const showPage1SignatureRow = itemLines.length >= 7;
  const compactPrint = itemLines.length >= 8;

  const partyCounts = challans.reduce((acc, ch) => {
    const name = (ch.partyName || '').trim();
    if (name) acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  const filteredChallans = partyFilter
    ? challans.filter((ch) => (ch.partyName || '').toLowerCase() === partyFilter.toLowerCase())
    : challans;

  const selectedPartyName = selectedChallanIds.length
    ? challans.find((ch) => ch._id === selectedChallanIds[0])?.partyName
    : '';

  useEffect(() => {
    fetchChallans();
    fetch(`${API_BASE_URL}/api/jobcard`)
      .then((res) => res.json())
      .then((data) => setJobCards(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error fetching job cards:', err));
  }, []);

  useEffect(() => {
    const printId = location.state?.printChallanId;
    const printDoc = location.state?.printDoc;
    if (!printId || !challans.length) return;

    const fromList = challans.find((item) => item._id === printId);
    const ch = mergeDocumentForPrint(
      mergePrintDoc(fromList, printDoc),
    );
    if (!ch) return;

    setPreviewChallans([ch]);
    setTempGstType(ch.gstType || 'CGST/SGST');
    setCopySelection({ ...DEFAULT_TAX_COPY_SELECTION });
    setIsModalOpen(true);

    const timer = setTimeout(() => {
      printElement('printable-challan');
    }, 1000);

    navigate('/challan/list', { replace: true, state: {} });
    return () => clearTimeout(timer);
  }, [challans, location.state?.printChallanId, navigate]);

  const fetchChallans = () => {
    fetch(`${API_BASE_URL}/api/challan`)
      .then(res => res.json())
      .then((data) => setChallans(mergeDocumentForPrintList(mergePaymentTypeList(data))))
      .catch(err => console.error("Error fetching Challans:", err));
  };

  const handleDelete = (id) => {
    setChallanToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (challanToDelete) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/challan/${challanToDelete}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          const deleted = challans.find((ch) => ch._id === challanToDelete);
          removeStoredPaymentType(challanToDelete, deleted?.challanNo);
          removeStoredDocumentExtras(challanToDelete, deleted?.challanNo);
          removeStoredItemNotes(challanToDelete, deleted?.challanNo);
          fetchChallans();
          setIsDeleteModalOpen(false);
          setChallanToDelete(null);
        }
      } catch (err) {
        console.error("Error deleting challan:", err);
      }
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    setChallans((prev) =>
      prev.map((ch) =>
        ch._id === id ? { ...ch, paymentStatus: newStatus } : ch
      )
    );
    setOpenDropdownId(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/challan/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: newStatus })
      });

      if (!response.ok) {
        throw new Error("Failed to update status on server");
      }
    } catch (err) {
      console.error("Error updating challan status:", err);
      fetchChallans();
      alert("Failed to update status. Please try again.");
    }
  };

  const toggleChallanSelect = (ch) => {
    setSelectedChallanIds((prev) => {
      if (prev.includes(ch._id)) {
        return prev.filter((id) => id !== ch._id);
      }
      if (prev.length > 0) {
        const first = challans.find((item) => item._id === prev[0]);
        if (first && first.partyName !== ch.partyName) {
          alert('Sirf ek hi party ke challan select kar sakte ho.');
          return prev;
        }
      }
      return [...prev, ch._id];
    });
  };

  const selectAllForParty = () => {
    if (!partyFilter) return;
    const ids = filteredChallans.map((ch) => ch._id);
    setSelectedChallanIds(ids);
  };

  const clearSelection = () => setSelectedChallanIds([]);

  const openPreview = (ch) => {
    const merged = mergeDocumentForPrint(ch);
    setPreviewChallans([merged]);
    setTempGstType(merged.gstType || 'CGST/SGST');
    setCopySelection({ ...DEFAULT_TAX_COPY_SELECTION });
    setIsModalOpen(true);
  };

  const openMergedPreview = () => {
    const selected = challans.filter((ch) => selectedChallanIds.includes(ch._id)).map(mergeDocumentForPrint);
    if (selected.length < 2) {
      alert('Combined print ke liye kam se kam 2 challan select karo.');
      return;
    }
    setPreviewChallans(selected);
    setTempGstType(selected[0]?.gstType || 'CGST/SGST');
    setCopySelection({ ...DEFAULT_TAX_COPY_SELECTION });
    setIsModalOpen(true);
  };

  const handleCopySelectionChange = (id, checked) => {
    setCopySelection((prev) => ({ ...prev, [id]: checked }));
  };

  const closePreview = () => {
    setIsModalOpen(false);
    setPreviewChallans([]);
  };

  const handlePrint = () => {
    const selected = getSelectedCopyIds(copySelection);
    if (!selected.length) {
      alert('Please select at least one copy type');
      return;
    }
    printElement('printable-challan', { copyIds: selected });
  };

  const handleDownloadPDF = async () => {
    const label = isMergedPrint
      ? `Challan_Combined_${primaryChallan?.partyName || 'party'}`
      : `Challan_${primaryChallan?.challanNo}`;
    await downloadAsPDF('printable-challan', label, setIsGenerating);
  };

  return (
    <div className="w-full px-4 mt-8 pb-12 text-gray-800">
      <div className="no-print">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 group flex items-center gap-3">
              <div className="bg-blue-600 w-1.5 h-6 rounded-full" />
              Manage Challan
            </h1>
          </div>
          <div className="text-sm text-gray-500 font-medium">
            Challan &gt; <span className="text-blue-600">Challan Listings</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 sm:p-6 flex flex-col gap-4 border-b border-gray-50">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              <h2 className="text-lg font-bold text-gray-800">Challan Listings</h2>
              <button
                onClick={() => navigate('/challan/add')}
                className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95"
              >
                <Plus size={18} /> Add New
              </button>
            </div>
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <select
                  value={partyFilter}
                  onChange={(e) => {
                    setPartyFilter(e.target.value);
                    setSelectedChallanIds([]);
                  }}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium min-w-48"
                >
                  <option value="">All Parties</option>
                  {Object.entries(partyCounts)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([name, count]) => (
                      <option key={name} value={name}>{name} ({count} challan{count > 1 ? 's' : ''})</option>
                    ))}
                </select>
                {partyFilter && (
                  <button
                    type="button"
                    onClick={selectAllForParty}
                    className="text-sm font-semibold text-blue-700 hover:text-blue-800"
                  >
                    Select all for {partyFilter}
                  </button>
                )}
              </div>
              {selectedChallanIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">
                    {selectedChallanIds.length} selected{selectedPartyName ? ` — ${selectedPartyName}` : ''}
                  </span>
                  {selectedChallanIds.length >= 2 && (
                    <button
                      type="button"
                      onClick={openMergedPreview}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm"
                    >
                      <Printer size={16} /> Print Combined
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-sm font-semibold text-gray-500 hover:text-gray-700 px-3 py-2"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto min-h-100 pb-40">
            <table className="w-full text-left whitespace-nowrap min-w-200">
              <thead>
                <tr className="bg-gray-50 text-gray-600 uppercase text-[10px] sm:text-xs font-bold tracking-wider">
                  <th className="px-3 py-4 w-10">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-4 sm:px-6 py-4">S.No.</th>
                  <th className="px-4 sm:px-6 py-4">Challan Number</th>
                  <th className="px-4 sm:px-6 py-4">Job Card</th>
                  <th className="px-4 sm:px-6 py-4">Party Name</th>
                  <th className="px-4 sm:px-6 py-4">Total Amount</th>
                  <th className="px-4 sm:px-6 py-4">Created At</th>
                  <th className="px-4 sm:px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredChallans.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 sm:px-6 py-10 text-center text-gray-500">
                      {partyFilter ? `No challans found for ${partyFilter}.` : 'No challans found.'}
                    </td>
                  </tr>
                ) : (
                  filteredChallans.map((ch, index) => (
                    <tr key={ch._id} className={`hover:bg-gray-50/80 transition-colors group ${selectedChallanIds.includes(ch._id) ? 'bg-blue-50/40' : ''}`}>
                      <td className="px-3 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedChallanIds.includes(ch._id)}
                          onChange={() => toggleChallanSelect(ch)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          title="Combined print ke liye select karo"
                        />
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm font-semibold text-blue-600 underline underline-offset-4 decoration-blue-100">{ch.challanNo}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-800">
                        <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200 text-xs text-gray-600 mr-2">
                          {ch.jobNumber}
                        </span>
                        {ch.jobName}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-800">{ch.partyName}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm font-bold text-gray-900">₹ {(ch.grandTotal ?? ch.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-500">
                        {new Date(ch.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-center">
                        <div className="flex justify-center items-center gap-2 sm:gap-3">
                          <button
                            onClick={() => openPreview(ch)}
                            className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition-all active:scale-90"
                            title="Print Challan"
                          >
                            <Printer size={16} />
                          </button>
                          <button
                            onClick={() => navigate('/challan/add', { state: { editData: mergeDocumentForPrint(ch) } })}
                            className="bg-teal-50 text-teal-600 p-2 rounded-lg hover:bg-teal-100 transition-all active:scale-90"
                            title="Edit challan"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(ch._id)}
                            className="bg-red-50 text-red-500 p-2 rounded-lg hover:bg-red-100 transition-all active:scale-90"
                            title="Delete challan"
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
        </div>

        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          title="Are you sure?"
          message="Are you sure you want to move this challan to trash?"
        />
      </div>

      {/* Challan Preview & Print Modal */}
      {isModalOpen && primaryChallan && (
        <div className="print-modal-overlay fixed inset-0 bg-black/60 z-100 flex items-stretch sm:items-center justify-center p-0 sm:p-4 overflow-y-auto print:static print:overflow-visible print:bg-white print:p-0">
          <div className="print-modal-shell bg-white border border-gray-300 w-full max-w-full relative h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[95vh] flex flex-col shadow-none print:max-h-none print:overflow-visible print:border-0 print:shadow-none print:h-auto">
            <div className="modal-header print-modal-header no-print p-3 sm:p-4 border-b bg-white">
              <div className="print-modal-title-row flex items-center justify-between gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                  {isMergedPrint ? `Combined Challan (${previewChallans.length})` : 'Challan Preview'}
                </h2>
                <button
                  onClick={closePreview}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors shrink-0 sm:hidden"
                  aria-label="Close preview"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="print-modal-toolbar mt-3 space-y-3">
                <TaxCopyTypeControls selection={copySelection} onChange={handleCopySelectionChange} />
                {getSelectedCopyIds(copySelection).length > 1 && (
                  <span className="inline-block text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                    {getSelectedCopyIds(copySelection).length} copies will print
                  </span>
                )}
                <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-2.5 rounded-xl text-sm font-bold border border-gray-200 w-full sm:w-auto">
                  <span className="text-gray-500 font-medium shrink-0">GST Mode:</span>
                  <select
                    value={tempGstType}
                    onChange={(e) => setTempGstType(e.target.value)}
                    className="bg-transparent text-blue-700 outline-none cursor-pointer font-bold w-full sm:w-auto"
                  >
                    <option value="CGST/SGST">CGST + SGST</option>
                    <option value="IGST">IGST</option>
                  </select>
                </div>
                <div className="print-modal-actions grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                <button
                  onClick={handleDownloadPDF}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-3 sm:px-6 sm:py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all disabled:opacity-50"
                >
                  {isGenerating ? "..." : <Download size={18} />}
                  PDF
                </button>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:px-6 sm:py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                >
                  <Printer size={18} /> Print
                </button>
                <button
                  onClick={closePreview}
                  className="hidden sm:inline-flex p-2 hover:bg-gray-200 rounded-full transition-colors col-span-2 sm:col-auto justify-self-end"
                  aria-label="Close preview"
                >
                  <X size={20} />
                </button>
                </div>
              </div>
            </div>

            <p className="print-preview-hint no-print px-3 py-2 text-[11px] font-semibold text-blue-700 bg-blue-50 border-b border-blue-100 sm:hidden">
              Swipe left/right to view the full challan before printing.
            </p>

            <div className="p-2 overflow-y-auto overflow-x-auto grow a4-page-container print:overflow-visible print:max-h-none print:h-auto print:p-0 print:grow-0" id="printable-content">
              <div
                id="printable-challan"
                className={`bg-white w-full shadow-none tax-invoice-print-page${compactPrint ? ' tax-print-compact' : ''}`}
              >
                <table className="tax-invoice w-full border-collapse text-black" style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                  <TaxInvoiceColGroup />
                  <tbody>
                    <tr>
                      <td colSpan={taxColCount} className="tax-cell text-center align-middle py-2">
                        <CompanyBrandName uppercase />
                        <p className="tax-header-line">{SELLER.address}</p>
                        <p className="tax-header-line">{SELLER.tel}, {SELLER.email}</p>
                        <SellerGstinMsmeLines />
                      </td>
                    </tr>

                    <tr>
                      <td colSpan={taxColCount} className="tax-cell tax-blue p-0">
                        <div className="tax-title-bar">
                          <div className="tax-title-text">DELIVERY CHALLAN</div>
                          <TaxCopyBox highlightCopy={getPreviewHighlightCopy(copySelection)} />
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td colSpan={taxHalfColSpan} className="tax-cell align-top p-1">
                        <TaxFieldsTable rows={[
                          ['Reverse Charge', primaryChallan.reverseCharge || 'No'],
                          ['Challan No.', challanNoLabel],
                          ['Challan Date', fmtTaxDate(challanDate)],
                          ['State', formatStateWithCode(primaryChallan.state || SELLER.state, primaryChallan.stateCode || SELLER.stateCode)],
                        ]} />
                      </td>
                      <td colSpan={taxHalfColSpanRight} className="tax-cell align-top p-1">
                        <TaxFieldsTable rows={[
                          ['Transportation Mode', 'Road'],
                          ['Vehicle No.', primaryChallan.vehicleNo || '-'],
                          ['Date of Supply', fmtTaxDate(challanDate)],
                          ['Place of Supply', 'Jaipur'],
                          ['Payment Type', primaryChallan.paymentType || '-'],
                          ['Job Ref', jobRefLabel || ''],
                        ]} />
                      </td>
                    </tr>

                    <tr>
                      <td colSpan={taxHalfColSpan} className="tax-cell align-top p-0">
                        <div className="tax-blue tax-section-title text-center py-0.5 px-1">Details of Receiver | Billed to:</div>
                        <div className="p-1">
                          <TaxFieldsTable rows={[
                            ['Name', billTo.partyName],
                            ['Address', billTo.address || '-'],
                            ['E-MAIL', billTo.emailId || '-'],
                            ['GSTIN', billTo.gstNo || 'URP'],
                            ['MOBILE', billTo.contactNo || '-'],
                            ['State', formatStateWithCode(billToState.state, billToState.code)],
                          ]} />
                        </div>
                      </td>
                      <td colSpan={taxHalfColSpanRight} className="tax-cell align-top p-0">
                        <div className="tax-blue tax-section-title text-center py-0.5 px-1">Details of Consignee | Shipped to:</div>
                        <div className="p-1">
                          <TaxFieldsTable rows={[
                            ['Name', shipTo.partyName],
                            ['Address', shipTo.address || '-'],
                            ['E-MAIL', shipTo.emailId || '-'],
                            ['GSTIN', shipTo.gstNo || 'URP'],
                            ['MOBILE', shipTo.contactNo || '-'],
                            ['State', formatStateWithCode(shipToState.state, shipToState.code)],
                          ]} />
                        </div>
                      </td>
                    </tr>

                    <TaxClassicItemsBlock
                      itemLines={itemLines}
                      freight={totalFreight}
                      totalCgst={totalCgst}
                      totalSgst={totalSgst}
                      totalIgst={totalIgst}
                      isIGST={isIGST}
                      emptyProductRows={emptyProductRows}
                      amountWithTax={amountWithTax}
                      amountInWords={numberToWords(amountWithTax)}
                      renderItemDescription={(row) => (
                        <>
                          <div>{row.item.description}</div>
                          {row.item.jobNumber && (
                            <div className="text-[9px] font-bold mt-0.5">Job Ref: {row.item.jobNumber}</div>
                          )}
                          {isMergedPrint && row.item.challanNo && (
                            <div className="text-[9px] font-bold">Challan: {row.item.challanNo}</div>
                          )}
                        </>
                      )}
                    />

                    <TaxAnalysisSection
                      groups={buildTaxAnalysisGroups(itemLines, totalFreight, isIGST, freightGstPercent)}
                      isIGST={isIGST}
                      taxAmountInWords={numberToWords(totalGstAmount)}
                      colSpan={taxColCount}
                    />

                    {showPage1SignatureRow && (
                      <TaxDocumentSignaturesRow
                        leftColSpan={taxHalfColSpan}
                        rightColSpan={taxHalfColSpanRight}
                        printOnly
                      />
                    )}

                    <tr className="tax-terms-bank-section">
                      <td colSpan={taxHalfColSpan} className="tax-cell tax-footer-cell align-top p-1">
                        <TaxTermsAndReceiverSignature />
                      </td>
                      <td colSpan={taxHalfColSpanRight} className="tax-cell tax-footer-cell align-top p-1">
                        <TaxBankAndAuthorisedSignature />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChallanList;
