import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { generatePrintHtml } from './printDocument';

/**
 * NUCLEAR STYLE SHIELD V3 - The Ultimate Solution for PDF Fidelity.
 * This version uses a Two-Stage Sanitization process:
 * 1. Style Scraper Sanitization: Scrubs problematic oklch/oklab from CSS rule strings.
 * 2. DOM Sanitizer: Iterates every element in the iframe and converts computed 'okl' colors to HEX.
 * This ensures html2canvas never encounters a modern color function it can't parse.
 */

const getSanitizedSystemStyles = () => {
  let combinedStyles = '';
  try {
    // 1. Capture all <style> tags (Common in Vite/Emotion/Tailwind)
    document.querySelectorAll('style').forEach(tag => {
      combinedStyles += tag.innerHTML + '\n';
    });

    // 2. Capture all external accessible stylesheets
    Array.from(document.styleSheets).forEach(sheet => {
      try {
        if (!sheet.href || sheet.href.startsWith(window.location.origin)) {
          const rules = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
          combinedStyles += rules + '\n';
        }
      } catch (e) {}
    });

    // 3. NUCLEAR CSS SCRUB
    // This removes the crash-causing functions from the actual CSS definitions
    return combinedStyles
      .replace(/oklch\([^)]+\)/g, '#2563eb') // Primary Blue
      .replace(/oklab\([^)]+\)/g, '#2563eb') // Secondary Blue
      .replace(/lab\([^)]+\)/g, '#2563eb') // Support standard lab()
      .replace(/color-mix\([^)]+\)/g, '#3b82f6'); // Clean up modern color-mix too
  } catch (error) {
    return '';
  }
};

/**
 * Stage 2: The DOM Sanitizer
 * Manually converts computed styles into hardcoded HEX values to avoid html2canvas parser crashes.
 */
const sanitizeDOMInIframe = (doc) => {
  const allElements = doc.querySelectorAll('*');
  allElements.forEach(el => {
    try {
      const computed = window.getComputedStyle(el);
      
      // Brand name suffix — always black on tax documents
      if (el.classList?.contains('company-brand-accent')) {
        el.style.color = '#000000';
      }

      // Sanitizing Text Color
      if (computed.color && (computed.color.includes('okl') || computed.color.includes('lab') || computed.color.includes('color-mix'))) {
        el.style.color = '#1e293b'; 
      }
      
      // Sanitizing Background Color
      if (computed.backgroundColor && (computed.backgroundColor.includes('okl') || computed.backgroundColor.includes('lab') || computed.backgroundColor.includes('color-mix'))) {
        el.style.backgroundColor = '#2563eb';
      }

      // Special case for Total box (Grand Totals)
      if (el.className && el.className.includes('grandTotal')) {
        el.style.backgroundColor = '#2563eb';
        el.style.color = '#ffffff';
      }
    } catch (e) {}
  });
};

export const downloadAsPDF = async (elementId, filename, onProgressChange = () => {}, options = {}) => {
  let iframe = null;
  try {
    onProgressChange(true);

    const element = document.getElementById(elementId);
    if (!element) throw new Error(`Element with ID "${elementId}" not found`);

    const isJobCard = elementId === 'printable-inner';
    const isEstimate = elementId === 'printable-estimate' || element.classList.contains('estimate-print-page');
    const isChallan = elementId === 'printable-challan' || element.classList.contains('challan-print-page');
    const isTaxInvoice = (elementId === 'printable-invoice' || elementId === 'printable-inner' || elementId === 'printable-estimate' || element.classList.contains('tax-invoice-print-page') || element.classList.contains('estimate-print-page')) && !isChallan;
    const isReport = elementId === 'report-table-container';

    const baseName = filename.replace(/\.(pdf|png)$/i, '');
    const cleanFilename = `${baseName}.png`;

    // Client-side High-Resolution PNG capture of the EXACT print layout (same HTML/CSS as printDocument.js)
    await new Promise(resolve => setTimeout(resolve, 100));

    const rawPrintHtml = generatePrintHtml(elementId, {
      copyIds: options.copyIds,
      docTitle: cleanFilename
    });

    // EMULATE PRINT MEDIA: html2canvas renders "screen" CSS, so activate every @media print rule
    // (incl. Tailwind print: variants) and disable screen-only rules -> identical structure to Print.
    const pageMargin = isJobCard ? '0mm' : (isChallan || isEstimate) ? '4mm' : isReport ? '4mm' : '5mm';
    const printEmulationCss = `<style id="print-emulation">
      html body { padding: ${pageMargin} !important; margin: 0 !important; background: #ffffff !important; box-sizing: border-box !important; }
    </style>`;
    const fullPrintHtml = rawPrintHtml
      .replace(/@media\s+print/gi, '@media all')
      .replace(/@media\s+screen/gi, '@media not all')
      .replace('</head>', `${printEmulationCss}</head>`);

    // Iframe = exact physical paper width (same as the print sheet)
    const iframeWidth = isChallan ? '148mm' : isReport ? '297mm' : '210mm';

    // Setup Isolation Ghost Iframe
    iframe = document.createElement('iframe');
    Object.assign(iframe.style, {
      visibility: 'hidden',
      position: 'fixed',
      left: '-20000px',
      top: '-20000px',
      width: iframeWidth,
      height: '4000px',
      border: 'none'
    });
    document.body.appendChild(iframe);

    // Inject Unified Print HTML
    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(fullPrintHtml);
    iframeDoc.close();

    // 4. THE LONG WAIT & CLEANUP
    // Increased to 1.8s to ensure full layout stabilization
    await new Promise(resolve => setTimeout(resolve, 1800));

    // STAGE 2 SANITIZATION: Clean up the computed styles before conversion
    sanitizeDOMInIframe(iframeDoc);

    // Final text cleanup for NaNs
    iframeDoc.querySelectorAll('*').forEach(node => {
      try {
        if (node.children && node.children.length === 0 && node.textContent && node.textContent.includes('NaN')) {
          node.textContent = node.textContent.replace(/NaN/g, '0.00');
        }
      } catch (e) {}
    });

    // 5. Capture with Extreme High Resolution (Sharp & crisp, matching print)
    // Find top-level page container to capture the complete page structure
    // Capture the full sheet (body incl. page-margin padding) so all copies + margins match print
    const wrapper = iframeDoc.body.firstElementChild;
    if (wrapper) {
      wrapper.style.minHeight = '0';
      wrapper.style.height = 'auto';
    }
    const captureTarget = iframeDoc.body;
    
    // Choose ultra-sharp rendering scale (scale 4 for 300+ DPI razor-sharp vector-like text & borders)
    const renderScale = typeof window !== 'undefined' && window.devicePixelRatio && window.devicePixelRatio > 2 
      ? Math.max(4, Math.round(window.devicePixelRatio * 2)) 
      : 4;

    const canvas = await html2canvas(captureTarget, {
      scale: renderScale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
      imageTimeout: 15000,
      onclone: (clonedDoc) => {
        // Ensure antialiasing and crisp rendering on cloned document
        const clonedBody = clonedDoc.body;
        if (clonedBody) {
          clonedBody.style.webkitFontSmoothing = 'antialiased';
          clonedBody.style.textRendering = 'geometricPrecision';
        }
      }
    });

    // 6. Save as lossless PNG image (no PDF scaling = no squish)
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = cleanFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
    
  } catch (error) {
    console.error("Shield Failure:", error);
    alert(`System Error: ${error.message}`);
  } finally {
    if (iframe && document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
    onProgressChange(false);
  }
};
