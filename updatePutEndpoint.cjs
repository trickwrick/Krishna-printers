const fs = require('fs');
let code = fs.readFileSync('server/routes/paperStockRoutes.js', 'utf8');

const putBlockStart = code.indexOf('router.put(\'/:id\'');
const putBlockEnd = code.indexOf('router.delete(\'/:id\'');
const putBlock = code.substring(putBlockStart, putBlockEnd);

const updatedPutBlock = putBlock.replace(
  'lowStockThreshold, paperSource } = req.body;',
  'lowStockThreshold, paperSource, isQuickAdd, challanNo, invoiceNo, createdAt } = req.body;'
).replace(
  'note: \'Cover stock added\',',
  'note: isQuickAdd ? \'Quick Add\' : \'Cover stock added\',\n          challanNo: challanNo || \'\',\n          invoiceNo: invoiceNo || \'\',\n          createdAt: isQuickAdd && createdAt ? new Date(createdAt) : Date.now(),'
).replace(
  'note: \'Inner stock added\',',
  'note: isQuickAdd ? \'Quick Add\' : \'Inner stock added\',\n          challanNo: challanNo || \'\',\n          invoiceNo: invoiceNo || \'\',\n          createdAt: isQuickAdd && createdAt ? new Date(createdAt) : Date.now(),'
);

code = code.substring(0, putBlockStart) + updatedPutBlock + code.substring(putBlockEnd);
fs.writeFileSync('server/routes/paperStockRoutes.js', code);
console.log('PUT endpoint updated');
