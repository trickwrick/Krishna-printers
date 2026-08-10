import React from 'react';
import { Phone, Mail } from 'lucide-react';
import { getItemPrintDescription, getItemPrintNote } from './itemSuggestions';

export const SELLER = {
  name: 'KRISHNA PRINTERS',
  brandName: 'Krishna',
  brandSuffix: 'Printers',
  address: 'F-113 Kartarpura Ind. area, Road no 4 22 Godam, Bank of Baroda ke Pass, Jaipur, Rajasthan 302006',
  office: '',
  factory: '',
  gstin: '08AJYPS6620D1ZQ',
  msmeRegNo: '',
  pan: 'AJYPS6620D',
  state: 'Rajasthan',
  stateCode: '08',
  tel: '',
  email: '',
  bank: {
    holder: 'Krishna Printers',
    name: '',
    account: '',
    branch: '',
    ifsc: '',
  },
};

export const fmtTaxDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  const day = String(d.getDate()).padStart(2, '0');
  const mon = String(d.getMonth() + 1).padStart(2, '0');
  const yr = d.getFullYear();
  return `${day}-${mon}-${yr}`;
};

export const fmtAmt = (value) =>
  Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtTaxRate = (rate) => {
  const n = Number(rate || 0);
  if (!n) return '';
  const text = parseFloat(n.toFixed(2)).toString();
  return `${text}%`;
};

export const getStateFromGst = (gstNo) => {
  const gst = (gstNo || '').trim();
  if (gst.length >= 2 && gst !== 'URP') {
    return { state: 'Rajasthan', code: gst.slice(0, 2) };
  }
  return { state: 'Rajasthan', code: '08' };
};

export const formatStateWithCode = (state, code) => {
  const stateText = (state || '').trim();
  const codeText = (code || '').trim();
  if (stateText && codeText) return `${stateText}, Code : ${codeText}`;
  return stateText || codeText || '';
};

export const TaxFieldsTable = ({ rows }) => (
  <table className="tax-fields-inner w-full">
    <tbody>
      {rows.map(([label, value], i) => (
        <tr key={i}>
          <td className="align-top tax-field-label">{label}</td>
          <td className="align-top tax-field-colon">:</td>
          <td className="align-top tax-field-value">{value ?? ''}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export const SellerGstinMsmeLines = () => (
  <>
    <p className="tax-header-line"><span className="tax-field-label">GSTIN :</span> {SELLER.gstin}</p>
  </>
);

export const TaxTermsSection = () => (
  <>
    <p className="tax-section-title mb-1">Terms And Conditions</p>
    <ol className="tax-terms-list">
      <li>Goods once sold will not be taken back.</li>
      <li>Any Dispute Shall Subject to Jaipur Jurisdiction.</li>
      <li>E.&amp;O.E.</li>
      <li>The company is not responsible for any transit damage or loss.</li>
      <li>All Goods Return / Replace only if damage by company transport.</li>
    </ol>
  </>
);

export const TaxBankDetailsSection = () => (
  <>
    <p className="tax-section-title mb-1">Bank Details</p>
    <TaxFieldsTable rows={[
      ['Account Holder Name', SELLER.bank.holder],
      ['Bank Account Number', SELLER.bank.account],
      ['Bank IFSC Code', SELLER.bank.ifsc],
      ['Bank Name', SELLER.bank.name],
      ['Bank Branch Name', SELLER.bank.branch],
    ]} />
  </>
);

export const TaxDocumentSignaturesRow = ({ leftColSpan, rightColSpan, printOnly = false }) => (
  <tr className={`tax-signature-section${printOnly ? ' tax-print-only-signature' : ''}`}>
    <td colSpan={leftColSpan} className="tax-cell align-top p-1">
      <div className="tax-footer-sign-block">
        <div className="tax-sign-space">&nbsp;</div>
        <p className="tax-section-title">Receiver signature</p>
      </div>
    </td>
    <td colSpan={rightColSpan} className="tax-cell align-top p-1">
      <div className="tax-footer-sign-block tax-footer-sign-block-right">
        <p className="tax-section-title text-right">For, {SELLER.name}</p>
        <div className="tax-sign-space">&nbsp;</div>
        <p className="text-right tax-section-title">Authorised Signatory</p>
      </div>
    </td>
  </tr>
);

export const TaxTermsAndReceiverSignature = () => (
  <div className="tax-footer-col">
    <div className="tax-footer-col-top">
      <p className="tax-section-title mb-1">Terms And Conditions</p>
      <ol className="tax-terms-list">
        <li>Goods once sold will not be taken back.</li>
        <li>Any Dispute Shall Subject to Jaipur Jurisdiction.</li>
        <li>E.&amp;O.E.</li>
        <li>The company is not responsible for any transit damage or loss.</li>
        <li>All Goods Return / Replace only if damage by company transport.</li>
      </ol>
    </div>
    <div className="tax-footer-sign-block">
      <div className="tax-sign-space">&nbsp;</div>
      <p className="tax-section-title">Receiver signature</p>
    </div>
  </div>
);

export const TaxBankAndAuthorisedSignature = () => (
  <div className="tax-footer-col">
    <div className="tax-footer-col-top">
      <p className="tax-section-title mb-1">Bank Details</p>
      <TaxFieldsTable rows={[
        ['Account Holder Name', SELLER.bank.holder],
        ['Bank Account Number', SELLER.bank.account],
        ['Bank IFSC Code', SELLER.bank.ifsc],
        ['Bank Name', SELLER.bank.name],
        ['Bank Branch Name', SELLER.bank.branch],
      ]} />
    </div>
    <div className="tax-footer-sign-block tax-footer-sign-block-right">
      <p className="tax-section-title text-right">For, {SELLER.name}</p>
      <div className="tax-sign-space">&nbsp;</div>
      <p className="text-right tax-section-title">Authorised Signatory</p>
    </div>
  </div>
);

export const buildTaxItemLine = (item, idx, fallbackGst = 18, isIGST = false) => {
  const taxable = Number(item.total) || Number(item.qty || 0) * Number(item.rate || 0);
  const pct = Number(item.gstPercent ?? fallbackGst);
  const cgstRate = isIGST ? 0 : pct / 2;
  const sgstRate = isIGST ? 0 : pct / 2;
  const igstRate = isIGST ? pct : 0;
  const cgstAmt = isIGST ? 0 : (taxable * cgstRate) / 100;
  const sgstAmt = isIGST ? 0 : (taxable * sgstRate) / 100;
  const igstAmt = isIGST ? (taxable * igstRate) / 100 : 0;
  return {
    idx: idx + 1,
    item,
    taxable,
    cgstRate,
    sgstRate,
    igstRate,
    cgstAmt,
    sgstAmt,
    igstAmt,
    lineTotal: taxable + cgstAmt + sgstAmt + igstAmt,
  };
};

export const MIN_PRODUCT_TABLE_ROWS = 14;
export const MIN_CHALLAN_PRODUCT_TABLE_ROWS = 14;

/** Short invoices get filler rows for entry space; cap avoids pushing footer to page 2. */
export function getEmptyProductRowCount(usedRows = 0, options = {}) {
  const itemLineCount = options.itemLineCount ?? 0;
  const minRows = options.minRows ?? MIN_PRODUCT_TABLE_ROWS;

  if (itemLineCount >= 8) {
    return 0;
  }

  const maxEmpty = itemLineCount <= 4 ? 6 : 3;
  return Math.max(0, Math.min(maxEmpty, minRows - usedRows));
}

export const getTaxTableColCount = () => 7;

export const getTaxTableHalfColSpans = () => {
  const total = getTaxTableColCount();
  const left = Math.floor(total / 2);
  return { left, right: total - left };
};

export const TaxInvoiceColGroup = () => (
  <colgroup>
    <col style={{ width: '5%' }} />
    <col style={{ width: '32%' }} />
    <col style={{ width: '10%' }} />
    <col style={{ width: '10%' }} />
    <col style={{ width: '12%' }} />
    <col style={{ width: '6%' }} />
    <col style={{ width: '25%' }} />
  </colgroup>
);

/** One tall row with per-column vertical borders (no horizontal lines in the empty zone). */
export const TaxItemEmptyRow = ({ rowCount = 2 }) => (
  <tr className="tax-item-empty-row tax-items-empty-band" style={{ '--empty-rows': rowCount }}>
    {Array.from({ length: getTaxTableColCount() }, (_, i) => (
      <td key={i} className="tax-item-empty-cell">&nbsp;</td>
    ))}
  </tr>
);

export const ClassicTaxItemsHeader = () => (
  <tr className="tax-item-header-row text-center font-bold">
    <td className="tax-cell">Sl No.</td>
    <td className="tax-cell text-left">Description of Goods</td>
    <td className="tax-cell">HSN/SAC</td>
    <td className="tax-cell">GST Rate</td>
    <td className="tax-cell">Rate</td>
    <td className="tax-cell">per</td>
    <td className="tax-cell">Amount</td>
  </tr>
);

export const ESTIMATE_COL_COUNT = 8;

export const getEstimateHalfColSpans = () => ({ left: 4, right: 4 });

export const EstimateColGroup = () => (
  <colgroup>
    <col style={{ width: '5%' }} />
    <col style={{ width: '30%' }} />
    <col style={{ width: '10%' }} />
    <col style={{ width: '8%' }} />
    <col style={{ width: '6%' }} />
    <col style={{ width: '12%' }} />
    <col style={{ width: '8%' }} />
    <col style={{ width: '21%' }} />
  </colgroup>
);

export const EstimateItemsHeader = () => (
  <tr className="tax-item-header-row text-center font-bold">
    <td className="tax-cell">Sl No.</td>
    <td className="tax-cell text-left">Description of Goods</td>
    <td className="tax-cell">HSN/SAC</td>
    <td className="tax-cell">Qty</td>
    <td className="tax-cell">per</td>
    <td className="tax-cell">Rate</td>
    <td className="tax-cell">GST Rate</td>
    <td className="tax-cell">Amount</td>
  </tr>
);

export const EstimateItemRow = ({ row, stripeClass = 'tax-items-stripe-row tax-stripe-white' }) => (
  <tr className={`tax-item-main-row ${stripeClass}`}>
    <td className="tax-cell text-center align-top tax-item-value">{row.idx}</td>
    <td className="tax-cell align-top tax-item-name">
      <ItemPrintDescription item={row} />
    </td>
    <td className="tax-cell text-center align-top tax-item-value">{row.hsn || ''}</td>
    <td className="tax-cell text-center align-top tax-item-value">{row.qty}</td>
    <td className="tax-cell text-center align-top tax-item-value">{(row.per || 'PCS').trim() || 'PCS'}</td>
    <td className="tax-cell text-right align-top tax-item-value">{fmtAmt(row.rate)}</td>
    <td className="tax-cell text-center align-top tax-item-value">{row.gstPercent} %</td>
    <td className="tax-cell text-right align-top tax-item-total">{fmtAmt(row.total)}</td>
  </tr>
);

export const EstimateEmptyRow = ({ rowCount = 1 }) => (
  <tr className="tax-item-empty-row tax-items-empty-band" style={{ '--empty-rows': rowCount }}>
    {Array.from({ length: ESTIMATE_COL_COUNT }, (_, i) => (
      <td key={i} className="tax-item-empty-cell">&nbsp;</td>
    ))}
  </tr>
);

export const EstimateChargeSubRow = ({ label, amount, stripeClass = 'tax-items-stripe-row tax-stripe-grey', isTransport = false }) => (
  <tr className={`tax-item-sub-row ${stripeClass}${isTransport ? ' tax-item-sub-transport' : ''}`}>
    <td className="tax-cell tax-item-sub-pad">&nbsp;</td>
    <td colSpan={6} className="tax-cell tax-item-sub-label text-right">{label}</td>
    <td className="tax-cell text-right tax-item-sub-amount">{fmtAmt(amount)}</td>
  </tr>
);

export const EstimateGrandTotalRow = ({ amountWithTax }) => (
  <tr className="tax-item-grand-total-row font-bold">
    <td className="tax-cell" colSpan={6}>&nbsp;</td>
    <td className="tax-cell text-right tax-item-grand-label">Total</td>
    <td className="tax-cell text-right tax-item-grand-amount">{fmtAmt(amountWithTax)} ₹</td>
  </tr>
);

export const EstimateItemsBlock = ({
  items = [],
  emptyProductRows = 0,
  freight = 0,
  gstAmount = 0,
  gstType = 'CGST/SGST',
  grandTotal = 0,
}) => {
  let stripeIndex = 0;
  const getStripeClass = () => {
    const stripeClass = stripeIndex % 2 === 0 ? 'tax-items-stripe-row tax-stripe-white' : 'tax-items-stripe-row tax-stripe-grey';
    stripeIndex += 1;
    return stripeClass;
  };
  const gstLabel = gstType === 'IGST' ? 'IGST' : 'CGST + SGST';

  return (
    <>
      <EstimateItemsHeader />
      {items.map((row) => (
        <EstimateItemRow key={row.idx} row={row} stripeClass={getStripeClass()} />
      ))}
      {freight > 0 && (
        <EstimateChargeSubRow label="Freight" amount={freight} stripeClass={getStripeClass()} isTransport />
      )}
      {gstAmount > 0 && (
        <EstimateChargeSubRow label={gstLabel} amount={gstAmount} stripeClass={getStripeClass()} />
      )}
      {emptyProductRows > 0 && <EstimateEmptyRow rowCount={emptyProductRows} />}
      <EstimateGrandTotalRow amountWithTax={grandTotal} />
    </>
  );
};

export const ItemPrintDescription = ({ item }) => {
  const description = getItemPrintDescription(item);
  const note = getItemPrintNote(item);
  if (!note) return description;
  return (
    <div className="tax-item-print-desc">
      <div>{description}</div>
      <div className="tax-item-print-note">{note}</div>
    </div>
  );
};

export const ClassicTaxItemRow = ({ row, isIGST = false, children, stripeClass = 'tax-items-stripe-row tax-stripe-white' }) => {
  const gstPercent = isIGST ? row.igstRate : row.cgstRate + row.sgstRate;
  return (
    <tr className={`tax-item-main-row ${stripeClass}`}>
      <td className="tax-cell text-center align-top tax-item-value">{row.idx}</td>
      <td className="tax-cell align-top tax-item-name">
        {children || <ItemPrintDescription item={row.item} />}
      </td>
      <td className="tax-cell text-center align-top tax-item-value">{row.item.hsn || ''}</td>
      <td className="tax-cell text-center align-top tax-item-value">{gstPercent} %</td>
      <td className="tax-cell text-right align-top tax-item-value">{fmtAmt(row.item.rate)}</td>
      <td className="tax-cell text-center align-top tax-item-value">{(row.item.per || 'PCS').trim() || 'PCS'}</td>
      <td className="tax-cell text-right align-top tax-item-total">{fmtAmt(row.taxable)}</td>
    </tr>
  );
};

export const ClassicTaxItemsTotalRow = ({ amountWithTax }) => (
  <tr className="tax-item-grand-total-row font-bold">
    <td className="tax-cell">&nbsp;</td>
    <td className="tax-cell text-right tax-item-grand-label">Total</td>
    <td className="tax-cell">&nbsp;</td>
    <td className="tax-cell">&nbsp;</td>
    <td className="tax-cell">&nbsp;</td>
    <td className="tax-cell">&nbsp;</td>
    <td className="tax-cell text-right tax-item-grand-amount">{fmtAmt(amountWithTax)} ₹</td>
  </tr>
);

export const ClassicAmountInWordsRow = ({ words }) => (
  <tr className="tax-amount-words-row">
    <td colSpan={getTaxTableColCount()} className="tax-cell tax-amount-words-cell">
      <span className="tax-amount-words-label">Amount Chargeable (in words):</span>{' '}
      <span className="tax-amount-words-value">{words} Indian Rupees Only</span>
      <span className="tax-amount-words-eoe">E. &amp; O.E</span>
    </td>
  </tr>
);

export const TaxClassicItemsBlock = ({
  itemLines,
  freight = 0,
  totalCgst = 0,
  totalSgst = 0,
  totalIgst = 0,
  isIGST = false,
  emptyProductRows = 2,
  amountWithTax = 0,
  amountInWords = '',
  renderItemDescription,
}) => {
  let stripeIndex = 0;
  const getStripeClass = () => {
    const stripeClass = stripeIndex % 2 === 0 ? 'tax-items-stripe-row tax-stripe-white' : 'tax-items-stripe-row tax-stripe-grey';
    stripeIndex += 1;
    return stripeClass;
  };

  return (
    <>
      <ClassicTaxItemsHeader />
      {itemLines.map((row) => (
        <ClassicTaxItemRow
          key={row.idx}
          row={row}
          isIGST={isIGST}
          stripeClass={getStripeClass()}
        >
          {renderItemDescription ? renderItemDescription(row) : undefined}
        </ClassicTaxItemRow>
      ))}
      <TaxItemGstChargeRows
        freight={freight}
        totalCgst={totalCgst}
        totalSgst={totalSgst}
        totalIgst={totalIgst}
        isIGST={isIGST}
        getStripeClass={getStripeClass}
      />
      {emptyProductRows > 0 && <TaxItemEmptyRow rowCount={emptyProductRows} />}
      <ClassicTaxItemsTotalRow amountWithTax={amountWithTax} />
      {amountInWords && <ClassicAmountInWordsRow words={amountInWords} />}
    </>
  );
};

export function buildTaxAnalysisGroups(itemLines = [], freight = 0, isIGST = false, freightGstPercent = 18) {
  const buckets = new Map();

  itemLines.forEach((row) => {
    const key = (row.item.hsn || '').trim();
    if (!buckets.has(key)) {
      buckets.set(key, {
        hsn: key,
        taxable: 0,
        cgstAmt: 0,
        sgstAmt: 0,
        igstAmt: 0,
        cgstRate: row.cgstRate,
        sgstRate: row.sgstRate,
        igstRate: row.igstRate,
      });
    }
    const bucket = buckets.get(key);
    bucket.taxable += row.taxable;
    bucket.cgstAmt += row.cgstAmt;
    bucket.sgstAmt += row.sgstAmt;
    bucket.igstAmt += row.igstAmt;
  });

  if (freight > 0) {
    const freightKey = itemLines.length === 1 ? (itemLines[0].item.hsn || '').trim() : '';
    if (!buckets.has(freightKey)) {
      buckets.set(freightKey, {
        hsn: freightKey,
        taxable: 0,
        cgstAmt: 0,
        sgstAmt: 0,
        igstAmt: 0,
        cgstRate: isIGST ? 0 : freightGstPercent / 2,
        sgstRate: isIGST ? 0 : freightGstPercent / 2,
        igstRate: isIGST ? freightGstPercent : 0,
      });
    }
    const bucket = buckets.get(freightKey);
    bucket.taxable += freight;
    if (isIGST) {
      bucket.igstAmt += (freight * freightGstPercent) / 100;
      bucket.igstRate = freightGstPercent;
    } else {
      const half = freightGstPercent / 2;
      bucket.cgstAmt += (freight * half) / 100;
      bucket.sgstAmt += (freight * half) / 100;
      bucket.cgstRate = half;
      bucket.sgstRate = half;
    }
  }

  const groups = Array.from(buckets.values()).map((group) => ({
    ...group,
    totalTax: group.cgstAmt + group.sgstAmt + group.igstAmt,
  }));

  if (!groups.length) {
    return [{
      hsn: '',
      taxable: 0,
      cgstAmt: 0,
      sgstAmt: 0,
      igstAmt: 0,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
      totalTax: 0,
    }];
  }

  return groups;
}

export const TaxAnalysisSection = ({ groups = [], isIGST = false, taxAmountInWords = '', colSpan = getTaxTableColCount() }) => {
  const colCount = isIGST ? 5 : 7;
  const rows = groups.length ? groups : [{
    hsn: '',
    taxable: 0,
    cgstAmt: 0,
    sgstAmt: 0,
    igstAmt: 0,
    cgstRate: 0,
    sgstRate: 0,
    igstRate: 0,
    totalTax: 0,
  }];

  const totals = rows.reduce(
    (acc, group) => ({
      taxable: acc.taxable + group.taxable,
      cgstAmt: acc.cgstAmt + group.cgstAmt,
      sgstAmt: acc.sgstAmt + group.sgstAmt,
      igstAmt: acc.igstAmt + group.igstAmt,
      totalTax: acc.totalTax + group.totalTax,
    }),
    { taxable: 0, cgstAmt: 0, sgstAmt: 0, igstAmt: 0, totalTax: 0 },
  );

  return (
    <tr>
      <td colSpan={colSpan} className="tax-cell tax-analysis-wrap p-0">
        <table className="tax-analysis-table w-full border-collapse">
          <colgroup>
            {isIGST ? (
              <>
                <col style={{ width: '12%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '19%' }} />
                <col style={{ width: '19%' }} />
              </>
            ) : (
              <>
                <col style={{ width: '12%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '18%' }} />
              </>
            )}
          </colgroup>
          <tbody>
            <tr className="tax-analysis-title-row">
              <td colSpan={colCount} className="tax-cell text-center font-bold">Tax Analysis</td>
            </tr>
            <tr className="tax-analysis-header-row text-center font-bold">
              <td className="tax-cell tax-analysis-hsn" rowSpan={2}>HSN/SAC</td>
              <td className="tax-cell" rowSpan={2}>Taxable<br />Value</td>
              {isIGST ? (
                <td className="tax-cell" colSpan={2}>IGST</td>
              ) : (
                <>
                  <td className="tax-cell" colSpan={2}>CGST</td>
                  <td className="tax-cell" colSpan={2}>SGST/UTGST</td>
                </>
              )}
              <td className="tax-cell" rowSpan={2}>Total Tax<br />Amount</td>
            </tr>
            <tr className="tax-analysis-header-row text-center font-bold">
              {isIGST ? (
                <>
                  <td className="tax-cell">Rate</td>
                  <td className="tax-cell">Amount</td>
                </>
              ) : (
                <>
                  <td className="tax-cell">Rate</td>
                  <td className="tax-cell">Amount</td>
                  <td className="tax-cell">Rate</td>
                  <td className="tax-cell">Amount</td>
                </>
              )}
            </tr>
            {rows.map((group, idx) => (
              <tr key={idx} className="tax-analysis-data-row">
                <td className="tax-cell tax-analysis-hsn text-center">{group.hsn || ''}</td>
                <td className="tax-cell text-right">{fmtAmt(group.taxable)}</td>
                {isIGST ? (
                  <>
                    <td className="tax-cell text-center">{fmtTaxRate(group.igstRate)}</td>
                    <td className="tax-cell text-right">{fmtAmt(group.igstAmt)}</td>
                  </>
                ) : (
                  <>
                    <td className="tax-cell text-center">{fmtTaxRate(group.cgstRate)}</td>
                    <td className="tax-cell text-right">{fmtAmt(group.cgstAmt)}</td>
                    <td className="tax-cell text-center">{fmtTaxRate(group.sgstRate)}</td>
                    <td className="tax-cell text-right">{fmtAmt(group.sgstAmt)}</td>
                  </>
                )}
                <td className="tax-cell text-right">{fmtAmt(group.totalTax)}</td>
              </tr>
            ))}
            <tr className="tax-analysis-total-row font-bold">
              <td className="tax-cell tax-analysis-total-label text-right">Total:</td>
              <td className="tax-cell text-right">{fmtAmt(totals.taxable)}</td>
              {isIGST ? (
                <>
                  <td className="tax-cell">&nbsp;</td>
                  <td className="tax-cell text-right">{fmtAmt(totals.igstAmt)}</td>
                </>
              ) : (
                <>
                  <td className="tax-cell">&nbsp;</td>
                  <td className="tax-cell text-right">{fmtAmt(totals.cgstAmt)}</td>
                  <td className="tax-cell">&nbsp;</td>
                  <td className="tax-cell text-right">{fmtAmt(totals.sgstAmt)}</td>
                </>
              )}
              <td className="tax-cell text-right">{fmtAmt(totals.totalTax)}</td>
            </tr>
            <tr className="tax-analysis-words-row">
              <td colSpan={colCount} className="tax-cell">
                <span className="font-bold">Tax Amount (in words):</span>{' '}
                <span className="tax-analysis-words-value">{taxAmountInWords} Indian Rupees Only</span>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
};

export const CompanyBrandName = ({ className = '', large = false, uppercase = false }) => {
  const brandName = uppercase ? SELLER.brandName.toUpperCase() : SELLER.brandName;
  const brandSuffix = uppercase ? SELLER.brandSuffix.toUpperCase() : SELLER.brandSuffix;
  return (
    <p className={`tax-company-name company-brand-name ${large ? 'company-brand-name-lg' : ''} ${className}`.trim()}>
      {brandName}{' '}
      <span className="company-brand-accent" style={{ color: '#000000' }}>{brandSuffix}</span>
    </p>
  );
};

export const TaxChargeSubRow = ({ label, amount, stripeClass = 'tax-items-stripe-row tax-stripe-grey', isTransport = false }) => (
  <tr className={`tax-item-sub-row ${stripeClass}${isTransport ? ' tax-item-sub-transport' : ''}`}>
    <td className="tax-cell tax-item-sub-pad">&nbsp;</td>
    <td className="tax-cell tax-item-sub-label text-right">{label}</td>
    <td className="tax-cell tax-item-sub-pad">&nbsp;</td>
    <td className="tax-cell tax-item-sub-pad">&nbsp;</td>
    <td className="tax-cell tax-item-sub-pad">&nbsp;</td>
    <td className="tax-cell tax-item-sub-pad">&nbsp;</td>
    <td className="tax-cell text-right tax-item-sub-amount">{fmtAmt(amount)}</td>
  </tr>
);

export function getTaxChargeSubRowCount(freight = 0, isIGST = false) {
  const gstRows = isIGST ? 1 : 2;
  return gstRows + (freight > 0 ? 1 : 0);
}

export const TaxItemGstChargeRows = ({ freight = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0, isIGST = false, getStripeClass }) => {
  const stripe = () => (getStripeClass ? getStripeClass() : 'tax-items-stripe-row tax-stripe-grey');
  return (
    <>
      {freight > 0 && (
        <TaxChargeSubRow label="Freight" amount={freight} stripeClass={stripe()} isTransport />
      )}
      {isIGST ? (
        <TaxChargeSubRow label="IGST Integrated Gst" amount={totalIgst} stripeClass={stripe()} />
      ) : (
        <>
          <TaxChargeSubRow label="SGST State Gst" amount={totalSgst} stripeClass={stripe()} />
          <TaxChargeSubRow label="CGST Central Gst" amount={totalCgst} stripeClass={stripe()} />
        </>
      )}
    </>
  );
};

export const TAX_COPY_LINES = [
  { id: 'original', text: 'Original for Recipient' },
  { id: 'duplicateFor', text: 'Duplicate for' },
  { id: 'transporter', text: 'Transporter' },
  { id: 'triplicate', text: 'Triplicate for Supplier' },
];

export const DEFAULT_TAX_COPY_SELECTION = {
  original: true,
  duplicateFor: false,
  transporter: false,
  triplicate: false,
};

export function getSelectedCopyIds(selection = DEFAULT_TAX_COPY_SELECTION) {
  return TAX_COPY_LINES.filter((line) => selection[line.id]).map((line) => line.id);
}

export function getPreviewHighlightCopy(selection = DEFAULT_TAX_COPY_SELECTION) {
  const selected = getSelectedCopyIds(selection);
  return selected[0] || 'original';
}

export const TaxCopyBox = ({ highlightCopy = 'original' }) => (
  <div className="tax-copy-box">
    {TAX_COPY_LINES.map((line) => (
      <div key={line.id} className="tax-copy-row" data-copy-id={line.id}>
        <span className="tax-copy-mark">{highlightCopy === line.id ? '☑' : '☐'}</span>
        <p className="tax-copy-label">{line.text}</p>
      </div>
    ))}
  </div>
);

export const TaxCopyTypeControls = ({ selection, onChange }) => (
  <div className="tax-copy-controls flex flex-wrap items-center gap-x-3 gap-y-1.5 bg-gray-100 px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 max-w-full">
    <span className="text-gray-500 font-medium text-sm shrink-0">Copy Type:</span>
    {TAX_COPY_LINES.map((line) => (
      <label key={line.id} className="inline-flex items-center gap-1.5 cursor-pointer text-gray-800 whitespace-nowrap">
        <input
          type="checkbox"
          className="rounded border-gray-400 text-blue-600 focus:ring-blue-500"
          checked={!!selection?.[line.id]}
          onChange={(e) => onChange(line.id, e.target.checked)}
        />
        <span>{line.text}</span>
      </label>
    ))}
  </div>
);

/** Job card / document letterhead — left company info, right doc badge + GSTIN/PAN */
export const JobCardLetterhead = ({ docTitle = 'JOB CARD' }) => (
  <div className="job-card-letterhead flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-6 px-1">
    <div className="grow pr-4">
      <h1 className="job-card-brand text-[34px] font-black tracking-tight text-gray-900 leading-none mb-2">
        {SELLER.brandName}{' '}
        <span className="company-brand-accent" style={{ color: '#000000' }}>{SELLER.brandSuffix}</span>
      </h1>
      <div className="space-y-0.5">
        {SELLER.address ? (
          <p className="job-card-letterhead-line text-[10px] text-gray-800 leading-snug whitespace-pre-wrap max-w-md">
            <span className="font-semibold">{SELLER.address}</span>
          </p>
        ) : (
          <>
            <p className="job-card-letterhead-line text-[10px] text-gray-800 leading-snug">
              <span className="text-blue-600 font-bold uppercase">Office:</span>{' '}
              <span className="font-semibold">{SELLER.office}</span>
            </p>
            <p className="job-card-letterhead-line text-[10px] text-gray-800 leading-snug">
              <span className="text-blue-600 font-bold uppercase">Factory:</span>{' '}
              <span className="font-semibold">{SELLER.factory}</span>
            </p>
          </>
        )}
        
        {(SELLER.tel || SELLER.email) && (
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
            {SELLER.tel && (
              <p className="job-card-letterhead-line text-[10px] font-semibold text-gray-800 flex items-center gap-1">
                <Phone size={10} className="text-blue-500 shrink-0" strokeWidth={2.5} />
                {SELLER.tel}
              </p>
            )}
            {SELLER.email && (
              <p className="job-card-letterhead-line text-[10px] font-semibold text-gray-800 flex items-center gap-1">
                <Mail size={10} className="text-blue-500 shrink-0" strokeWidth={2.5} />
                {SELLER.email}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
    <div className="text-right flex flex-col items-end shrink-0">
      <div className="job-card-doc-badge bg-blue-600 text-white px-6 py-1.5 rounded-md text-[11px] font-black uppercase tracking-widest">
        {docTitle}
      </div>
      <div className="text-[9px] font-bold text-gray-500 uppercase flex flex-col gap-1 mt-2 tracking-wide text-right">
        <span>
          GSTIN:{' '}
          <span className="text-gray-900 font-black normal-case tracking-normal">{SELLER.gstin}</span>
        </span>
        <span>
          PAN:{' '}
          <span className="text-gray-900 font-black normal-case tracking-normal">{SELLER.pan}</span>
        </span>
      </div>
    </div>
  </div>
);
