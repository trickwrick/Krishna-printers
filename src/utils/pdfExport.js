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

    const pdfPageFormat = isChallan ? 'A5' : 'A4';
    const pageOrientation = isReport ? 'landscape' : 'portrait';
    const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

    // 1. PRIMARY ENGINE: Native Chromium Server Engine (100% Crisp Vector Quality, exactly like Print Preview)
    try {
      const fullHtml = generatePrintHtml(elementId, {
        copyIds: options.copyIds,
        docTitle: cleanFilename
      });

      if (fullHtml) {
        const response = await fetch('/api/pdf/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html: fullHtml,
            filename: cleanFilename,
            format: pdfPageFormat,
            orientation: pageOrientation
          })
        });

        if (response.ok) {
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = cleanFilename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(downloadUrl);
          return;
        }
      }
    } catch (serverErr) {
      console.warn("Backend PDF generation fallback:", serverErr);
    }

    // 2. SECONDARY ENGINE FALLBACK: Client-side High-Resolution Canvas
    // Uses the EXACT same unified HTML and CSS as printDocument.js
    await new Promise(resolve => setTimeout(resolve, 100));

    const fullPrintHtml = generatePrintHtml(elementId, {
      copyIds: options.copyIds,
      docTitle: cleanFilename
    });

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
    const captureTarget = iframeDoc.getElementById(elementId) || iframeDoc.body.firstElementChild || iframeDoc.body;
    
    // Exact target width in pixels so html2canvas renders at true full document proportions without blur/downscaling
    const targetPixelWidth = Math.round(captureTarget.getBoundingClientRect().width || (isChallan ? 560 : 794));

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
      width: targetPixelWidth,
      windowWidth: targetPixelWidth,
      onclone: (clonedDoc) => {
        // Ensure antialiasing and crisp rendering on cloned document
        const clonedBody = clonedDoc.body;
        if (clonedBody) {
          clonedBody.style.webkitFontSmoothing = 'antialiased';
          clonedBody.style.textRendering = 'geometricPrecision';
        }
      }
    });

    // 6. Save as PDF with lossless PNG format to eliminate JPEG compression artifacts and fuzziness
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ 
      orientation: pageOrientation, 
      unit: 'mm', 
      format: pdfPageFormat,
      compress: true
    });
    const pdfPageWidth = pdf.internal.pageSize.getWidth();
    const pdfPageHeight = pdf.internal.pageSize.getHeight();
    const renderedHeight = (canvas.height * pdfPageWidth) / canvas.width;
    
    // Fit onto single page if it's within tolerance to avoid blank second page
    const finalHeight = renderedHeight <= pdfPageHeight ? renderedHeight : pdfPageHeight;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfPageWidth, finalHeight, undefined, 'FAST');
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    
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
