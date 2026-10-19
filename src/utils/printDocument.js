/**
 * Print helper — same isolation approach as pdfExport (full-size iframe + inlined styles).
 */

export function applyTaxCopyHighlight(root, highlightCopy) {
  if (!root) return;
  root.querySelectorAll('[data-copy-id]').forEach((row) => {
    const copyId = row.getAttribute('data-copy-id');
    const mark = row.querySelector('.tax-copy-mark');
    if (mark) mark.textContent = copyId === highlightCopy ? '☑' : '☐';
  });
}

function buildTaxPrintContent(element, copyIds) {
  const pageClass = element.className || 'tax-invoice-print-page';

  if (!copyIds?.length) {
    // Preserve the root wrapper classes in print iframe so
    // print-only CSS selectors like `.financial-statement-print ...` apply.
    return `<div class="${pageClass}">${element.innerHTML}</div>`;
  }

  if (copyIds.length === 1) {
    const clone = element.cloneNode(true);
    applyTaxCopyHighlight(clone, copyIds[0]);
    return clone.innerHTML;
  }

  return copyIds
    .map((copyId, idx) => {
      const clone = element.cloneNode(true);
      clone.removeAttribute('id');
      applyTaxCopyHighlight(clone, copyId);
      const pageBreak = idx < copyIds.length - 1 ? 'page-break-after: always; break-after: page;' : '';
      return `<div class="tax-print-copy-page ${pageClass}" style="${pageBreak}">${clone.innerHTML}</div>`;
    })
    .join('');
}

const getSanitizedSystemStyles = () => {
  let combinedStyles = '';
  try {
    document.querySelectorAll('style').forEach((tag) => {
      combinedStyles += tag.innerHTML + '\n';
    });
    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        if (!sheet.href || sheet.href.startsWith(window.location.origin)) {
          const rules = Array.from(sheet.cssRules).map((rule) => rule.cssText).join('\n');
          combinedStyles += rules + '\n';
        }
      } catch {
        /* cross-origin stylesheet */
      }
    });
    return combinedStyles
      .replace(/oklch\([^)]+\)/g, '#ffffff')
      .replace(/oklab\([^)]+\)/g, '#ffffff')
      .replace(/color-mix\([^)]+\)/g, '#f3f4f6')
      .replace(/\[class\*=["']fixed["']\][^{]*\{[^}]*\}/g, '');
  } catch {
    return '';
  }
};

export function printElement(elementId, options = {}) {
  const { copyIds } = options;
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  const isJobCard = elementId === 'printable-inner';
  const isEstimate = elementId === 'printable-estimate' || element.classList.contains('estimate-print-page');
  const isFinancialStatement = elementId === 'printable-financial-statement' || element.classList.contains('financial-statement-print');
  const isChallan = elementId === 'printable-challan' || element.classList.contains('challan-print-page');
  const isTaxInvoice = (elementId === 'printable-invoice' || elementId === 'printable-inner' || elementId === 'printable-estimate' || element.classList.contains('tax-invoice-print-page') || element.classList.contains('estimate-print-page')) && !isChallan;
  const isFullWidth = isJobCard || isTaxInvoice || isChallan || isEstimate || isFinancialStatement;
  const pageMargin = isChallan ? '4mm' : isFinancialStatement ? '4mm' : isFullWidth ? '5mm' : '12mm';
  const contentPadding = isChallan ? '1mm 2mm' : isFinancialStatement ? '2mm 3mm' : isFullWidth ? '2mm 3mm' : '6mm 8mm';
  const wrapperStyle = isFullWidth
    ? 'width:100%;max-width:100%;margin:0;padding:0;background:#ffffff;box-sizing:border-box;min-height:100vh;'
    : 'width:210mm;max-width:210mm;margin:0 auto;padding:0;background:white;box-sizing:border-box;';
  const iframeWidth = isChallan ? '148mm' : isFinancialStatement ? '297mm' : '210mm';

  document.getElementById('print-root-temp')?.remove();
  document.body.classList.remove('is-printing');

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Print');
  Object.assign(iframe.style, {
    visibility: 'hidden',
    position: 'fixed',
    left: '-20000px',
    top: '0',
    width: iframeWidth,
    height: '4000px',
    border: 'none',
  });

  const sanitizedStyles = getSanitizedSystemStyles();

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Print</title>
        <style>
          @page { size: ${isChallan ? 'A5 portrait' : isFinancialStatement ? 'A4 landscape' : 'A4'}; margin: ${pageMargin}; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
            height: auto !important;
            width: 100% !important;
          }
          body > div {
            background: #ffffff !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print, button, .job-card-print-page h4 svg, .job-card-print-page svg.lucide, [role="button"] { display: none !important; }
          .job-card-print-page,
          #printable-inner.job-card-print-page,
          .a4-page.job-card-print-page {
            width: 100% !important;
            max-width: none !important;
            min-height: 0 !important;
            height: auto !important;
            max-height: none !important;
            padding: ${contentPadding} !important;
            margin: 0 !important;
            background: #ffffff !important;
            display: block !important;
            overflow: visible !important;
            position: static !important;
            border: none !important;
            box-shadow: none !important;
          }
          .job-card-print-page .min-h-25 { min-height: 0 !important; }
          .job-card-work-instructions,
          .job-card-work-instructions-box {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            page-break-inside: avoid !important;
            background: #ffffff !important;
            border: 1px solid #374151 !important;
          }
          .job-card-work-instructions-text,
          .job-card-section-heading-text {
            color: #000 !important;
            font-weight: 700 !important;
          }
          .job-card-print-page.mx-auto { margin-left: 0 !important; margin-right: 0 !important; }
          .a4-page:not(.job-card-print-page):not(.tax-invoice-print-page):not(.challan-print-page), .invoice-print-page:not(.tax-invoice-print-page) {
            width: 186mm !important;
            max-width: 186mm !important;
            min-height: 0 !important;
            height: auto !important;
            max-height: none !important;
            padding: 6mm 8mm !important;
            margin: 0 auto !important;
            background: white !important;
            display: block !important;
            overflow: visible !important;
            position: static !important;
          }
          .challan-print-page {
            width: 100% !important;
            max-width: none !important;
            min-height: 0 !important;
            height: auto !important;
            max-height: none !important;
            padding: ${contentPadding} !important;
            margin: 0 !important;
            background: white !important;
            display: block !important;
            overflow: visible !important;
            position: static !important;
            border: none !important;
            box-shadow: none !important;
          }
          .challan-print-page.mx-auto { margin-left: 0 !important; margin-right: 0 !important; }
          .challan-print-page .challan-items-table { min-height: 0 !important; }
          .challan-print-page .invoice-footer { margin-top: 1rem !important; page-break-inside: avoid !important; }
          .challan-print-page .invoice-footer > div:first-child { padding-top: 1.5rem !important; }
          .challan-print-page .invoice-footer > div:last-child { padding-top: 0.5rem !important; }
          .a4-page *, .invoice-print-page *, .challan-print-page *, .job-card-print-page * {
            overflow: visible !important;
            max-height: none !important;
          }
          table { display: table !important; width: 100% !important; }
          thead { display: table-header-group !important; }
          tbody { display: table-row-group !important; }
          tr { display: table-row !important; page-break-inside: avoid; }
          .tax-invoice-print-page tr { page-break-inside: auto !important; break-inside: auto !important; }
          .tax-invoice-print-page tr.tax-signature-section,
          .tax-invoice-print-page tr.tax-terms-bank-section,
          .tax-invoice-print-page tr.tax-item-grand-total-row,
          .tax-invoice-print-page tr.tax-amount-words-row {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          td, th { display: table-cell !important; }
          ${sanitizedStyles}
          .invoice-print-page, .challan-print-page {
            background: #ffffff !important;
          }
          .invoice-print-page .invoice-table-header,
          .invoice-print-page .invoice-table-header th,
          .challan-print-page thead tr,
          .challan-print-page thead th {
            background-color: #1e3a8a !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .invoice-print-page .invoice-grand-total,
          .invoice-print-page .invoice-grand-total span,
          .challan-print-page .invoice-grand-total,
          .challan-print-page .invoice-grand-total span {
            background-color: #1e3a8a !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .invoice-fill-row { display: none !important; }
          .gst-invoice-print-page,
          .gst-invoice-print-page .gst-invoice,
          .gst-invoice-print-page .gst-cell,
          .gst-invoice-print-page td,
          .gst-invoice-print-page th {
            color: #000 !important;
            background: #fff !important;
            border-color: #000 !important;
          }
          .tax-invoice-print-page {
            width: 100% !important;
            max-width: none !important;
            min-height: 0 !important;
            height: auto !important;
            max-height: none !important;
            padding: ${contentPadding} !important;
            margin: 0 !important;
            background: #ffffff !important;
            display: block !important;
            overflow: visible !important;
            position: static !important;
            border: none !important;
            box-shadow: none !important;
          }
          .tax-invoice-print-page .tax-blue,
          .tax-invoice-print-page .tax-copy-box {
            background-color: #d9e9f7 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .tax-invoice-print-page .tax-invoice {
            width: 100% !important;
          }
          .tax-invoice-print-page .tax-cell,
          .tax-invoice-print-page td,
          .tax-invoice-print-page th {
            color: #000 !important;
            border-color: #000 !important;
          }
          .invoice-print-page td,
          .invoice-print-page th { padding-top: 3px !important; padding-bottom: 3px !important; }
          .invoice-print-page .invoice-footer { page-break-inside: avoid !important; }
          ${isJobCard ? `
          @page { size: A4; margin: 0 !important; }
          html, body, body > div, .job-card-print-page, .a4-page.job-card-print-page {
            background: #ffffff !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
          }
          .job-card-print-page, .a4-page.job-card-print-page {
            padding: 10mm !important;
            border: none !important;
            box-shadow: none !important;
          }
          .job-card-print-page .font-medium { font-weight: 700 !important; }
          .job-card-print-page .font-bold { font-weight: 800 !important; }
          .job-card-print-page .font-black { font-weight: 900 !important; }
          .job-card-print-page .italic { font-style: normal !important; font-weight: 700 !important; }
          .job-card-print-page .opacity-60 { opacity: 1 !important; }
          .job-card-print-page [class*="text-gray-4"],
          .job-card-print-page [class*="text-gray-5"],
          .job-card-print-page [class*="text-gray-6"] { color: #1f2937 !important; font-weight: 700 !important; }
          .job-card-print-page [class*="text-gray-7"] { color: #111827 !important; font-weight: 800 !important; }
          .job-card-print-page [class*="text-blue"] { color: #1e40af !important; font-weight: 800 !important; }
          .job-card-print-page [class*="text-indigo"],
          .job-card-print-page .job-card-printing-qty { color: #312e81 !important; font-weight: 800 !important; }
          .job-card-print-page [class*="text-cyan"] { color: #0e7490 !important; font-weight: 800 !important; }
          .job-card-print-page [class*="text-amber"] { color: #b45309 !important; font-weight: 800 !important; }
          .job-card-print-page [class*="text-rose"] { color: #be123c !important; font-weight: 800 !important; }
          .job-card-letterhead { border-color: #000 !important; }
          .job-card-letterhead .job-card-brand { font-weight: 900 !important; color: #000 !important; }
          .job-card-letterhead .job-card-brand .text-blue-600 { color: #000000 !important; font-weight: 900 !important; }
          .job-card-letterhead .job-card-letterhead-line { color: #000 !important; font-weight: 700 !important; }
          .job-card-letterhead .job-card-letterhead-line .text-blue-600 { color: #1d4ed8 !important; font-weight: 800 !important; }
          .job-card-doc-badge {
            background-color: #1d4ed8 !important;
            color: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-weight: 900 !important;
          }
          .job-card-print-table .job-card-brand {
            color: #000000 !important;
            font-weight: 900 !important;
          }
          .job-card-print-table .job-card-brand .company-brand-accent {
            color: #000000 !important;
            font-weight: 900 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .job-card-print-table .job-card-section-title {
            font-weight: 900 !important;
            font-size: 11px !important;
            letter-spacing: 0.06em !important;
            color: #000 !important;
            background-color: #d9e9f7 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .job-card-print-table .tax-field-label,
          .job-card-print-table .tax-field-colon {
            font-weight: 900 !important;
            color: #000 !important;
            font-size: 10px !important;
          }
          .job-card-print-table .tax-field-value {
            font-weight: 800 !important;
            color: #000 !important;
            font-size: 11px !important;
          }
          .job-card-print-table .job-card-work-instructions-text {
            font-weight: 900 !important;
            color: #000 !important;
            font-size: 14px !important;
            line-height: 1.55 !important;
          }
          ` : ''}
          ${isChallan ? `
          @page { size: A5 portrait; margin: 4mm !important; }
          html, body, body > div, .challan-print-page, #printable-challan {
            background: #ffffff !important;
            width: 100% !important;
            max-width: 148mm !important;
            margin: 0 auto !important;
            font-size: 10px !important;
          }
          .challan-table,
          #printable-challan .challan-table {
            font-size: 10px !important;
            border-collapse: collapse !important;
          }
          .challan-table .company-brand-name,
          #printable-challan .company-brand-name,
          .challan-table .tax-company-name,
          #printable-challan .tax-company-name {
            font-size: 19px !important;
            font-weight: 900 !important;
            letter-spacing: 0.02em !important;
            line-height: 1.25 !important;
            margin: 0 0 2px 0 !important;
            display: block !important;
          }
          .challan-table .tax-header-line,
          #printable-challan .tax-header-line {
            font-size: 8.5px !important;
            line-height: 1.3 !important;
            margin: 2px 0 !important;
            display: block !important;
          }
          .challan-table .tax-title-bar,
          #printable-challan .tax-title-bar {
            display: flex !important;
            align-items: stretch !important;
            min-height: 30px !important;
          }
          .challan-table .tax-title-text,
          #printable-challan .tax-title-text {
            font-size: 13px !important;
            font-weight: 900 !important;
            padding: 4px 0 !important;
            letter-spacing: 0.03em !important;
            line-height: 1.2 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .challan-table .tax-copy-box,
          #printable-challan .tax-copy-box {
            font-size: 7px !important;
            width: 95px !important;
            padding: 2px 3px !important;
            line-height: 1.25 !important;
          }
          .challan-table .tax-cell,
          #printable-challan .tax-cell {
            padding: 3px 4px !important;
            font-size: 9.5px !important;
            line-height: 1.3 !important;
            vertical-align: top !important;
          }
          .challan-table .tax-item-header-row .tax-cell,
          #printable-challan .tax-item-header-row .tax-cell {
            padding: 5px 4px !important;
            font-size: 9.5px !important;
            line-height: 1.3 !important;
            vertical-align: middle !important;
          }
          .challan-table .tax-item-main-row .tax-cell,
          #printable-challan .tax-item-main-row .tax-cell {
            padding: 4px 4px !important;
            font-size: 9.5px !important;
            line-height: 1.3 !important;
          }
          .challan-table .tax-item-grand-total-row .tax-cell,
          #printable-challan .tax-item-grand-total-row .tax-cell {
            padding: 4px 4px !important;
            font-size: 9.5px !important;
            line-height: 1.3 !important;
            vertical-align: middle !important;
          }
          .challan-table .tax-fields-inner td,
          #printable-challan .tax-fields-inner td {
            padding: 1px 2px !important;
            line-height: 1.3 !important;
          }
          .challan-table .tax-item-empty-row .tax-item-empty-cell,
          #printable-challan .tax-item-empty-row .tax-item-empty-cell {
            height: calc(26px * var(--empty-rows, 1)) !important;
            min-height: 80px !important;
            padding: 0 !important;
          }
          .challan-table .tax-terms-list,
          #printable-challan .tax-terms-list {
            font-size: 8px !important;
            line-height: 1.3 !important;
          }
          .challan-table .tax-terms-list li,
          #printable-challan .tax-terms-list li {
            margin-bottom: 2px !important;
          }
          .challan-table .tax-footer-sign-block,
          #printable-challan .tax-footer-sign-block {
            min-height: 38px !important;
          }
          .challan-table .tax-sign-space,
          #printable-challan .tax-sign-space {
            height: 28px !important;
          }
          ` : ''}
          ${isTaxInvoice ? `
          @page { size: A4; margin: 5mm !important; background: white; }
          html, body, body > div, .tax-invoice-print-page {
            background: #ffffff !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
          }
          .tax-invoice-print-page .tax-invoice,
          .tax-invoice-print-page .tax-cell:not(.tax-blue),
          .tax-invoice-print-page .job-card-section-body,
          .tax-invoice-print-page .job-card-meta-cell,
          .tax-invoice-print-page .job-card-work-instructions {
            background-color: #ffffff !important;
          }
          .tax-invoice-print-page .tax-cell.tax-blue,
          .tax-invoice-print-page .tax-blue,
          .tax-invoice-print-page .tax-title-bar,
          .tax-invoice-print-page .tax-title-text,
          .tax-invoice-print-page .tax-copy-box,
          .job-card-print-table .job-card-section-title {
            background-color: #d9e9f7 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .tax-invoice-print-page .tax-invoice,
          .tax-invoice-print-page .tax-cell,
          .tax-invoice-print-page td,
          .tax-invoice-print-page th,
          .tax-invoice-print-page p {
            color: #000 !important;
            font-weight: 700 !important;
            -webkit-font-smoothing: antialiased !important;
            text-rendering: optimizeLegibility !important;
          }
          .tax-invoice-print-page .tax-field-label,
          .tax-invoice-print-page .tax-field-colon,
          .tax-invoice-print-page .tax-blue,
          .tax-invoice-print-page .tax-title-text,
          .tax-invoice-print-page .tax-section-title,
          .tax-invoice-print-page .tax-summary-label,
          .tax-invoice-print-page .tax-summary-value,
          .tax-invoice-print-page .tax-item-header-row .tax-cell,
          .tax-invoice-print-page .font-bold {
            font-weight: 900 !important;
            color: #000 !important;
          }
          .tax-invoice-print-page .tax-title-text {
            font-size: 20px !important;
            letter-spacing: 0.05em !important;
            padding: 7px 0 !important;
          }
          .tax-invoice-print-page .tax-company-name,
          .tax-invoice-print-page .company-brand-name {
            font-weight: 900 !important;
            font-size: 36px !important;
            letter-spacing: 0.04em !important;
          }
          .tax-invoice-print-page .company-brand-accent {
            color: #000000 !important;
            font-weight: 900 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .tax-invoice-print-page .tax-item-total,
          .tax-invoice-print-page .tax-amount-words { font-weight: 900 !important; color: #000 !important; }
          .tax-invoice-print-page .tax-field-value,
          .tax-invoice-print-page .tax-item-value,
          .tax-invoice-print-page .tax-item-gst { font-weight: 800 !important; color: #000 !important; }
          .tax-print-copy-page { page-break-inside: avoid; }
          .tax-print-copy-page:not(:last-child) { page-break-after: always !important; break-after: page !important; }
          .tax-invoice-print-page tr.tax-print-only-signature {
            display: table-row !important;
          }
          ` : ''}
          ${isEstimate ? `
          @page { size: A4; margin: 4mm !important; background: white; }
          html, body, body > div, .estimate-print-page {
            background: #ffffff !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
          }
          .estimate-print-page {
            width: 100% !important;
            max-width: none !important;
            padding: 2mm 3mm !important;
            margin: 0 !important;
          }
          .estimate-print-page tr { page-break-inside: auto !important; break-inside: auto !important; }
          .estimate-print-page .estimate-print-footer,
          .estimate-print-page .estimate-print-items-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .estimate-print-page .estimate-print-header { margin-bottom: 6px !important; }
          .estimate-print-page .estimate-print-section { margin-bottom: 6px !important; }
          .estimate-print-page .estimate-print-meta-grid { margin-bottom: 6px !important; }
          .estimate-print-page .estimate-print-items-block { margin-bottom: 6px !important; min-height: 0 !important; overflow: visible !important; }
          .estimate-print-page .estimate-print-table { table-layout: fixed !important; width: 100% !important; }
          .estimate-print-page .estimate-print-desc-col,
          .estimate-print-page .estimate-print-desc-cell {
            width: 34% !important;
            min-width: 90px !important;
            word-break: break-word !important;
            overflow: visible !important;
            visibility: visible !important;
            color: #000 !important;
            -webkit-text-fill-color: #000 !important;
          }
          .estimate-print-page .estimate-print-item-desc,
          .estimate-print-page .estimate-print-item-note {
            color: #000 !important;
            -webkit-text-fill-color: #000 !important;
            visibility: visible !important;
            opacity: 1 !important;
            display: block !important;
            font-weight: 800 !important;
          }
          .estimate-print-page .estimate-print-title { font-size: 22px !important; line-height: 1.1 !important; }
          .estimate-print-page .estimate-print-footer { margin-top: 8px !important; }
          .estimate-print-page .estimate-print-empty-row td { padding-top: 4px !important; padding-bottom: 4px !important; }
          .estimate-print-page.estimate-print-compact td,
          .estimate-print-page.estimate-print-compact th { padding-top: 2px !important; padding-bottom: 2px !important; font-size: 9px !important; }
          .estimate-print-page.estimate-print-compact .estimate-print-meta-grid > div { padding: 4px !important; }
          ` : ''}
          ${isFinancialStatement ? `
          @page { size: A4 landscape; margin: 4mm !important; background: white; }
          html, body, body > div, .financial-statement-print {
            background: #ffffff !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .financial-statement-print {
            padding: 0 !important;
          }
          .financial-statement-print .overflow-x-auto,
          .financial-statement-print .financial-statement-table-wrap {
            overflow: visible !important;
            min-height: 0 !important;
          }
          .financial-statement-print .financial-statement-header {
            background: #eef2ff !important;
            border-bottom: 1px solid #c7d2fe !important;
            padding: 2mm 2mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .financial-statement-print .financial-statement-header-grid {
            display: grid !important;
            grid-template-columns: 1fr 42% !important;
            grid-template-rows: auto auto !important;
            column-gap: 5mm !important;
            row-gap: 3mm !important;
            align-items: start !important;
          }
          .financial-statement-print .financial-statement-doc-title-block {
            grid-column: 2 !important;
            grid-row: 1 !important;
            display: block !important;
            width: 100% !important;
            text-align: right !important;
            margin: 0 !important;
            padding: 3mm 2mm !important;
            border-top: 2px solid #4338ca !important;
            border-bottom: 2px solid #4338ca !important;
            background: transparent !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .financial-statement-print .financial-statement-company {
            grid-column: 1 !important;
            grid-row: 2 !important;
            flex: none !important;
            max-width: none !important;
          }
          .financial-statement-print .financial-statement-bank {
            grid-column: 2 !important;
            grid-row: 2 !important;
            text-align: right !important;
          }
          .financial-statement-print .financial-statement-company h3 {
            margin: 0 0 1mm 0 !important;
            font-size: 16px !important;
            font-weight: 900 !important;
            line-height: 1.15 !important;
            color: #111827 !important;
            text-transform: uppercase !important;
          }
          .financial-statement-print .financial-statement-company p,
          .financial-statement-print .financial-statement-bank p {
            margin: 0.5mm 0 !important;
            font-size: 9px !important;
            line-height: 1.35 !important;
            color: #1f2937 !important;
            font-weight: 600 !important;
          }
          .financial-statement-print .financial-statement-doc-title-line {
            display: block !important;
            text-align: right !important;
            font-size: 20px !important;
            font-weight: 900 !important;
            letter-spacing: 0.35em !important;
            line-height: 1.3 !important;
            color: #1e1b4b !important;
            margin: 0 !important;
            padding-right: 0.15em !important;
            text-transform: uppercase !important;
          }
          .financial-statement-print .financial-statement-doc-title-line-second {
            margin-top: 2mm !important;
          }
          .financial-statement-print .financial-statement-bank-label {
            color: #4338ca !important;
            font-size: 9px !important;
            font-weight: 900 !important;
            letter-spacing: 0.1em !important;
            text-transform: uppercase !important;
            margin-bottom: 1.5mm !important;
          }
          .financial-statement-print .financial-statement-muted {
            color: #6b7280 !important;
            font-weight: 700 !important;
          }
          .financial-statement-print .financial-statement-strong,
          .financial-statement-print .financial-statement-label {
            color: #111827 !important;
            font-weight: 900 !important;
          }
          .financial-statement-print .financial-statement-summary-grid {
            display: grid !important;
            width: 100% !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 2mm !important;
            margin-top: 2mm !important;
            padding-top: 2mm !important;
            border-top: 1px solid #c7d2fe !important;
          }
          .financial-statement-print .financial-statement-summary-card {
            background: #ffffff !important;
            border: 1px solid #e5e7eb !important;
            border-radius: 4px !important;
            padding: 2mm 3mm !important;
          }
          .financial-statement-print .financial-statement-summary-label {
            margin: 0 !important;
            font-size: 8px !important;
            font-weight: 900 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.08em !important;
            color: #6b7280 !important;
          }
          .financial-statement-print .financial-statement-summary-value {
            margin: 1mm 0 0 !important;
            font-size: 10px !important;
            font-weight: 900 !important;
            color: #111827 !important;
          }
          .financial-statement-print svg,
          .financial-statement-print .lucide {
            display: none !important;
          }
          .financial-statement-table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-size: 12px !important;
            line-height: 1.35 !important;
          }
          .financial-statement-table th,
          .financial-statement-table td {
            padding: 3px 4px !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
            vertical-align: top !important;
            font-size: 12px !important;
          }
          .financial-statement-col-value-date {
            display: none !important;
          }
          .financial-statement-table .financial-statement-col-particulars {
            width: 28% !important;
          }
          .financial-statement-print .financial-statement-footer {
            padding: 2mm 2mm !important;
            font-size: 7px !important;
          }
          .financial-statement-print .financial-statement-totals {
            padding: 2mm !important;
            gap: 2mm !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }
          .financial-statement-print .financial-statement-totals p {
            font-size: 7px !important;
          }
          .financial-statement-table thead {
            display: table-header-group !important;
          }
          .financial-statement-table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .financial-statement-table th {
            background-color: #4338ca !important;
            color: #fff !important;
            font-size: 11px !important;
            letter-spacing: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          ` : ''}
        </style>
      </head>
      <body class="bg-white">
        <div style="${wrapperStyle}">
          ${buildTaxPrintContent(element, copyIds)}
        </div>
      </body>
    </html>
  `);
  iframeDoc.close();

  const runPrint = () => {
    try {
      const win = iframe.contentWindow;
      if (!win) return;
      win.focus();
      win.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }
  };

  setTimeout(runPrint, 1200);
}
