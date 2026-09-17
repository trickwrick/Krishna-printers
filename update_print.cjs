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
const oldPrintEndStr = '</div>\n          </div>\n        </div>\n      )}\n    </>\n  );\n}';
const oldPrintEnd = formCode.indexOf('</div>', formCode.indexOf('Printable content ends')) + 6;

const newPrintHtml = '<div id=\"printable-inner\" className=\"bg-white w-full shadow-none tax-invoice-print-page\">\n' + tableHtml + '\n</div>';

formCode = formCode.substring(0, oldPrintStart) + newPrintHtml + '\n            <div className=\"p-4 border-t bg-white flex justify-end gap-3 no-print\">\n              <button\n                type=\"button\"\n                onClick={() => setShowPrintPreview(false)}\n                className=\"px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50\"\n              >\n                Close\n              </button>\n              <button\n                type=\"button\"\n                onClick={handlePrint}\n                className=\"inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded\"\n              >\n                <Printer size={16} />\n                Print\n              </button>\n            </div>\n          </div>\n        </div>\n      )}\n    </>\n  );\n}';

fs.writeFileSync('src/JobCardForm.jsx', formCode);
console.log('DONE');
