const fs = require('fs');
let code = fs.readFileSync('server/routes/jobCardRoutes.js', 'utf8');

// Add import
if (!code.includes('syncPaperStockWithJob')) {
  code = code.replace(
    'import { logPaperStockTransaction } from \'../utils/paperStockTransactions.js\';',
    'import { logPaperStockTransaction } from \'../utils/paperStockTransactions.js\';\nimport { syncPaperStockWithJob } from \'../utils/paperStockSync.js\';'
  );
}

// Replace the call
code = code.replace(
    /await syncStockFromJobChange\(previousJob, \{[\s\S]*?\}\);/,
    'await syncPaperStockWithJob({ ...req.body, _id: jobCard?._id || req.body._id }, previousJob);'
);

fs.writeFileSync('server/routes/jobCardRoutes.js', code);
console.log('Routes updated.');
