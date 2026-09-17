const fs = require('fs');
let code = fs.readFileSync('server/utils/paperStockReconciliation.js', 'utf8');

// modify the find query to use stockId if provided
code = code.replace(
    'const allStocks = await PaperStock.find();',
    'const query = stockId ? { _id: stockId } : {};\n    const allStocks = await PaperStock.find(query);'
);

code = code.replace(
    'export const reconcilePaperStock = async () => {',
    'export const reconcilePaperStock = async (stockId = null) => {'
);

fs.writeFileSync('server/utils/paperStockReconciliation.js', code);
console.log('Reconciliation script updated');
