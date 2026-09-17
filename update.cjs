const fs = require('fs');
let listingCode = fs.readFileSync('src/JobCardListing.jsx', 'utf8');
let formCode = fs.readFileSync('src/JobCardForm.jsx', 'utf8');

const tableStart = listingCode.indexOf('<table className=\"tax-invoice');
const tableEnd = listingCode.indexOf('</table>', tableStart) + 8;
let tableHtml = listingCode.substring(tableStart, tableEnd);

tableHtml = tableHtml.replace(/selectedCard/g, 'previewData');
tableHtml = tableHtml.replace(/getJobAttachments\(previewData\)/g, 'previewData.jobAttachments || []');
tableHtml = tableHtml.replace(/previewData\.coverPaperCount \|\| 0/g, 'previewData.paper || 0');
tableHtml = tableHtml.replace(/previewData\.coverPaperDetails/g, 'previewData.paper');

if (!formCode.includes('taxDocumentPrint')) {
    formCode = formCode.replace('import { API_BASE_URL }', 'import { SELLER, TaxFieldsTable, fmtTaxDate, CompanyBrandName } from \'./utils/taxDocumentPrint\';\nimport { API_BASE_URL }');
}

const oldPrintStart = formCode.indexOf('<div id=\"printable-inner\"');
const marker = '<div className=\"p-4 border-t bg-white flex justify-end gap-3 no-print\">';
const chunkEnd = formCode.indexOf(marker, oldPrintStart);

const newPrintHtml = '<div id=\"printable-inner\" className=\"bg-white w-full shadow-none tax-invoice-print-page\">\n' + tableHtml + '\n</div>\n</div>\n            ';
formCode = formCode.substring(0, oldPrintStart) + newPrintHtml + formCode.substring(chunkEnd);

fs.writeFileSync('src/JobCardForm.jsx', formCode);
console.log('Update successful');
