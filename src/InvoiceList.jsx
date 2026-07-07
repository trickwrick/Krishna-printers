import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Trash2, MoreHorizontal, Pencil, Printer, Eye, X, Download, Phone, Mail, Globe, Building2, MapPin, Calendar, FileDigit, AlertCircle, ChevronDown, Check } from 'lucide-react';
import { downloadAsPDF } from './utils/pdfExport';
import { printElement } from './utils/printDocument';
import { mergePaymentType, mergePaymentTypeList, removeStoredPaymentType } from './utils/paymentTypeStorage';
import {
  mergeDocumentForPrint,
  mergeDocumentForPrintList,
  mergePrintDoc,
  removeStoredDocumentExtras,
} from './utils/documentExtrasStorage';
import { mergeItemNotes, mergeItemNotesList, removeStoredItemNotes } from './utils/itemNoteStorage';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import { getBillToDetails, getShipToDetails } from './utils/shipAddress';
import { numberToWords } from './utils/numberToWords';
import { SELLER, fmtTaxDate, fmtAmt, getStateFromGst, formatStateWithCode, TaxFieldsTable, SellerGstinMsmeLines, TaxDocumentSignaturesRow, TaxTermsAndReceiverSignature, TaxBankAndAuthorisedSignature, buildTaxItemLine, getEmptyProductRowCount, CompanyBrandName, TaxCopyBox, TaxCopyTypeControls, DEFAULT_TAX_COPY_SELECTION, getSelectedCopyIds, getPreviewHighlightCopy, TaxInvoiceColGroup, getTaxTableColCount, getTaxTableHalfColSpans, getTaxChargeSubRowCount, TaxClassicItemsBlock, buildTaxAnalysisGroups, TaxAnalysisSection } from './utils/taxDocumentPrint';
import { API_BASE_URL } from './utils/apiBase';

const InvoiceList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [tempGstType, setTempGstType] = useState('CGST/SGST');
  const [copySelection, setCopySelection] = useState(DEFAULT_TAX_COPY_SELECTION);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [jobCards, setJobCards] = useState([]);

  const freight = selectedInvoice ? (Number(selectedInvoice.freight) || 0) : 0;
  const isIGST = tempGstType === 'IGST';
  const taxColCount = getTaxTableColCount();
  const { left: taxHalfColSpan, right: taxHalfColSpanRight } = getTaxTableHalfColSpans();
  const itemsSubTotal = selectedInvoice
    ? (Number(selectedInvoice.subTotal) || (selectedInvoice.items || []).reduce((sum, item) => sum + (Number(item.total) || 0), 0))
    : 0;
  const totalGstAmount = selectedInvoice
    ? (Number(selectedInvoice.gstAmount) || (selectedInvoice.items || []).reduce((sum, item) => {
        const line = Number(item.total) || 0;
        const pct = Number(item.gstPercent ?? selectedInvoice.gstPercent ?? 18);
        return sum + (line * pct) / 100;
      }, 0) + ((freight * Number((selectedInvoice.items?.[0]?.gstPercent ?? selectedInvoice.gstPercent ?? 18))) / 100))
    : 0;
  const linkedJobCard = selectedInvoice
    ? jobCards.find((card) => card.jobNumber === selectedInvoice.jobCard)
    : null;

  const billTo = getBillToDetails(linkedJobCard, selectedInvoice || {});
  const shipTo = getShipToDetails(linkedJobCard, selectedInvoice || {});
  const billToState = getStateFromGst(billTo.gstNo);
  const shipToState = getStateFromGst(shipTo.gstNo);

  const freightGstPercent = selectedInvoice
    ? Number(selectedInvoice.items?.[0]?.gstPercent ?? selectedInvoice.gstPercent ?? 18)
    : 18;
  const freightCgstAmt = isIGST ? 0 : (freight * (freightGstPercent / 2)) / 100;
  const freightSgstAmt = isIGST ? 0 : (freight * (freightGstPercent / 2)) / 100;
  const freightIgstAmt = isIGST ? (freight * freightGstPercent) / 100 : 0;

  const itemLines = selectedInvoice
    ? (selectedInvoice.items || []).map((item, idx) =>
        buildTaxItemLine(item, idx, selectedInvoice.gstPercent ?? 18, isIGST)
      )
    : [];

  const totalTaxable = itemsSubTotal + freight;
  const totalCgst = itemLines.reduce((sum, row) => sum + row.cgstAmt, 0) + freightCgstAmt;
  const totalSgst = itemLines.reduce((sum, row) => sum + row.sgstAmt, 0) + freightSgstAmt;
  const totalIgst = itemLines.reduce((sum, row) => sum + row.igstAmt, 0) + freightIgstAmt;
  const amountBeforeTax = totalTaxable;
  const amountWithTax = selectedInvoice?.totalAmount || 0;
  const productRowCount = itemLines.length + getTaxChargeSubRowCount(freight, isIGST);
  const emptyProductRows = selectedInvoice
    ? getEmptyProductRowCount(productRowCount, { itemLineCount: itemLines.length })
    : 0;
  const showPage1SignatureRow = itemLines.length >= 7;
  const compactPrint = itemLines.length >= 8;

  useEffect(() => {
    fetchInvoice();
    fetch(`${API_BASE_URL}/api/jobcard`)
      .then((res) => res.json())
      .then((data) => setJobCards(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error fetching job cards:', err));
  }, []);

  useEffect(() => {
    const printId = location.state?.printInvoiceId;
    const printDoc = location.state?.printDoc;
    if (!printId || !invoices.length) return;

    const fromList = invoices.find((item) => item._id === printId);
    const inv = mergeDocumentForPrint(
      mergePrintDoc(fromList, printDoc),
    );
    if (!inv) return;

    setSelectedInvoice(inv);
    setTempGstType(inv.gstType || 'CGST/SGST');
    setCopySelection({ ...DEFAULT_TAX_COPY_SELECTION });
    setIsModalOpen(true);

    const timer = setTimeout(() => {
      printElement('printable-invoice', { copyIds: getSelectedCopyIds(DEFAULT_TAX_COPY_SELECTION) });
    }, 1000);

    navigate('/invoice/list', { replace: true, state: {} });
    return () => clearTimeout(timer);
  }, [invoices, location.state?.printInvoiceId, navigate]);

  const fetchInvoice = () => {
    fetch(`${API_BASE_URL}/api/invoice`)
      .then(res => res.json())
      .then((data) => setInvoices(mergeDocumentForPrintList(mergePaymentTypeList(data))))
      .catch(err => console.error("Error fetching Invoices:", err));
  };

  const handleDelete = (id) => {
    setInvoiceToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (invoiceToDelete) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/invoice/${invoiceToDelete}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          const deleted = invoices.find((inv) => inv._id === invoiceToDelete);
          removeStoredPaymentType(invoiceToDelete, deleted?.invoiceNumber);
          removeStoredDocumentExtras(invoiceToDelete, deleted?.invoiceNumber);
          removeStoredItemNotes(invoiceToDelete, deleted?.invoiceNumber);
          fetchInvoice();
          setIsDeleteModalOpen(false);
          setInvoiceToDelete(null);
        }
      } catch (err) {
        console.error("Error deleting invoice:", err);
      }
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv._id === id ? { ...inv, paymentStatus: newStatus } : inv
      )
    );
    setOpenDropdownId(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/invoice/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: newStatus })
      });

      if (!response.ok) {
        throw new Error("Failed to update status on server");
      }
    } catch (err) {
      console.error("Error updating invoice status:", err);
      fetchInvoice();
    }
  };

  const openPreview = (inv) => {
    const merged = mergeDocumentForPrint(inv);
    setSelectedInvoice(merged);
    setTempGstType(merged.gstType || 'CGST/SGST');
    setCopySelection({ ...DEFAULT_TAX_COPY_SELECTION });
    setIsModalOpen(true);
  };

  const handleCopySelectionChange = (id, checked) => {
    setCopySelection((prev) => ({ ...prev, [id]: checked }));
  };

  const closePreview = () => {
    setIsModalOpen(false);
    setSelectedInvoice(null);
  };

  const handlePrint = () => {
    const selected = getSelectedCopyIds(copySelection);
    if (!selected.length) {
      alert('Please select at least one copy type');
      return;
    }
    printElement('printable-invoice', { copyIds: selected });
  };

  const handleDownloadPDF = async () => {
    await downloadAsPDF(
      'printable-invoice',
      `Invoice_${selectedInvoice.invoiceNumber}`,
      setIsGenerating
    );
  };

  return (
    <div className="w-full px-4 mt-8 pb-12 text-gray-800 print:p-0 print:m-0">
      <div className="no-print print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 group flex items-center gap-3">
              <div className="bg-blue-600 w-1.5 h-6 rounded-full" />
              Manage Invoice
            </h1>
          </div>
          <div className="text-sm text-gray-500 font-medium">
            Invoice &gt; <span className="text-blue-600">Invoice Listings</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 border-b border-gray-50">
            <h2 className="text-lg font-bold text-gray-800">Invoice Listings</h2>
            <button
              onClick={() => navigate('/invoice/add')}
              className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95"
            >
              <Plus size={18} /> Add New
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap min-w-175">
              <thead>
                <tr className="bg-gray-50 text-gray-600 uppercase text-[10px] sm:text-xs font-bold tracking-wider">
                  <th className="px-4 sm:px-6 py-4">S.No.</th>
                  <th className="px-4 sm:px-6 py-4">Invoice Number</th>
                  <th className="px-4 sm:px-6 py-4">Party Name</th>
                  <th className="px-4 sm:px-6 py-4">Total Amount</th>
                  <th className="px-4 sm:px-6 py-4">Status</th>
                  <th className="px-4 sm:px-6 py-4">Created At</th>
                  <th className="px-4 sm:px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                      No invoices found. Click &quot;Add New&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv, index) => (
                    <tr key={inv._id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm font-semibold text-blue-600 underline underline-offset-4 decoration-blue-100">{inv.invoiceNumber}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-800">{inv.partyName}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm font-bold text-gray-900">₹ {inv.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 sm:px-6 py-4 relative">
                        <div className="relative inline-block">
                          <button
                            onClick={() => setOpenDropdownId(openDropdownId === inv._id ? null : inv._id)}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-white text-xs font-bold transition-all shadow-sm ${(inv.paymentStatus === 'Completed') ? 'bg-emerald-500' : 'bg-orange-500'}`}
                          >
                            <div className="flex items-center gap-1.5">
                              {inv.paymentStatus === 'Completed' ? 'Completed' : 'Pending'}
                              {inv.paymentStatus === 'Completed' && <Check size={12} strokeWidth={3} />}
                            </div>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${openDropdownId === inv._id ? 'rotate-180' : ''}`} />
                          </button>

                          {openDropdownId === inv._id && (
                            <div className="absolute top-full left-0 mt-2 w-32 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                              {inv.paymentStatus === 'Completed' ? (
                                <button
                                  onClick={() => handleStatusUpdate(inv._id, 'Pending')}
                                  className="flex items-center justify-between w-full px-4 py-2 text-xs font-bold text-orange-600 hover:bg-orange-50 transition-colors"
                                >
                                  Pending
                                  <AlertCircle size={14} className="opacity-50" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusUpdate(inv._id, 'Completed')}
                                  className="flex items-center justify-between w-full px-4 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                  Completed
                                  <Check size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-500">
                        <div className="flex flex-col">
                          <span className="font-medium">{new Date(inv.createdAt).toLocaleDateString()}</span>
                          <span className="text-[10px] uppercase opacity-60 tracking-wider">
                            {new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-center">
                        <div className="flex justify-center items-center gap-2 sm:gap-3">
                          <button
                            onClick={() => openPreview(inv)}
                            className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition-all active:scale-90"
                            title="Print / View Invoice"
                          >
                            <Printer size={16} />
                          </button>
                          <button
                            onClick={() => navigate('/invoice/add', { state: { editData: mergeDocumentForPrint(inv) } })}
                            className="bg-teal-50 text-teal-600 p-2 rounded-lg hover:bg-teal-100 transition-all active:scale-90"
                            title="Edit invoice"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(inv._id)}
                            className="bg-red-50 text-red-500 p-2 rounded-lg hover:bg-red-100 transition-all active:scale-90"
                            title="Delete invoice"
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

          <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
              Showing {invoices.length > 0 ? `1 to ${invoices.length}` : '0'} of {invoices.length} entries
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Are you sure?"
        message="Are you sure you want to move to trash?"
      />

      {/* Invoice Preview & Print Modal */}
      {isModalOpen && selectedInvoice && (
        <div className="print-modal-overlay fixed inset-0 bg-black/60 z-100 flex items-stretch sm:items-center justify-center p-0 sm:p-4 overflow-y-auto print:static print:overflow-visible print:bg-white print:p-0">
          <div className="print-modal-shell bg-white border border-gray-300 w-full max-w-full relative h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[95vh] flex flex-col shadow-none print:max-h-none print:overflow-visible print:border-0 print:shadow-none print:h-auto">
            <div className="modal-header print-modal-header no-print p-3 sm:p-4 border-b bg-white">
              <div className="print-modal-title-row flex items-center justify-between gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Invoice Preview</h2>
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
                    onChange={async (e) => {
                      const newType = e.target.value;
                      setTempGstType(newType);
                      setInvoices(prev => prev.map(inv => inv._id === selectedInvoice._id ? { ...inv, gstType: newType } : inv));
                      try {
                        await fetch(`${API_BASE_URL}/api/invoice/${selectedInvoice._id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ gstType: newType })
                        });
                      } catch (err) {
                        console.error("Error updating GST Type on server:", err);
                      }
                    }}
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
              Swipe left/right to view the full invoice before printing.
            </p>

            <div className="p-2 overflow-y-auto overflow-x-auto grow a4-page-container print:overflow-visible print:max-h-none print:h-auto print:p-0 print:grow-0" id="printable-content">
              <div
                id="printable-invoice"
                className={`bg-white w-full shadow-none tax-invoice-print-page${compactPrint ? ' tax-print-compact' : ''}`}
              >
                <table className="tax-invoice w-full border-collapse text-black" style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                  <TaxInvoiceColGroup />
                  <tbody>
                    {/* Company header — full width */}
                    <tr>
                      <td colSpan={taxColCount} className="tax-cell text-center align-middle py-2">
                        <CompanyBrandName uppercase />
                        <p className="tax-header-line">{SELLER.address}</p>
                        <p className="tax-header-line">{SELLER.tel}, {SELLER.email}</p>
                        <SellerGstinMsmeLines />
                      </td>
                    </tr>

                    {/* TAX INVOICE bar + copy type (right) */}
                    <tr>
                      <td colSpan={taxColCount} className="tax-cell tax-blue p-0">
                        <div className="tax-title-bar">
                          <div className="tax-title-text">TAX INVOICE</div>
                          <TaxCopyBox highlightCopy={getPreviewHighlightCopy(copySelection)} />
                        </div>
                      </td>
                    </tr>

                    {/* Invoice meta */}
                    <tr>
                      <td colSpan={taxHalfColSpan} className="tax-cell align-top p-1">
                        <TaxFieldsTable rows={[
                          ['Reverse Charge', selectedInvoice.reverseCharge || 'No'],
                          ['Invoice No.', selectedInvoice.invoiceNumber],
                          ['Invoice Date', fmtTaxDate(selectedInvoice.date)],
                          ['Order No.', selectedInvoice.orderNo || selectedInvoice.jobCard || '-'],
                          ['Order Date', fmtTaxDate(selectedInvoice.orderDate || selectedInvoice.date)],
                          ['State', formatStateWithCode(selectedInvoice.state || SELLER.state, selectedInvoice.stateCode || SELLER.stateCode)],
                        ]} />
                      </td>
                      <td colSpan={taxHalfColSpanRight} className="tax-cell align-top p-1">
                        <TaxFieldsTable rows={[
                          ['Transportation Mode', 'Road'],
                          ['Vehicle No.', selectedInvoice.vehicleNo || '-'],
                          ['Date of Supply', fmtTaxDate(selectedInvoice.date)],
                          ['Place of Supply', 'Jaipur'],
                          ['Payment Type', selectedInvoice.paymentType || '-'],
                        ]} />
                      </td>
                    </tr>

                    {/* Bill to / Ship to */}
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
                      freight={freight}
                      totalCgst={totalCgst}
                      totalSgst={totalSgst}
                      totalIgst={totalIgst}
                      isIGST={isIGST}
                      emptyProductRows={emptyProductRows}
                      amountWithTax={amountWithTax}
                      amountInWords={numberToWords(amountWithTax)}
                    />

                    <TaxAnalysisSection
                      groups={buildTaxAnalysisGroups(itemLines, freight, isIGST, freightGstPercent)}
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

export default InvoiceList;
