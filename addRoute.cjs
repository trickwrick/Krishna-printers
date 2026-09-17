const fs = require('fs');
let code = fs.readFileSync('server/routes/paperStockRoutes.js', 'utf8');

if (!code.includes('reconcilePaperStock')) {
    code = code.replace(
        'import { logPaperStockTransaction } from \'../utils/paperStockTransactions.js\';',
        'import { logPaperStockTransaction } from \'../utils/paperStockTransactions.js\';\nimport { reconcilePaperStock } from \'../utils/paperStockReconciliation.js\';'
    );
    if (!code.includes('reconcilePaperStock')) {
       code = 'import { reconcilePaperStock } from \'../utils/paperStockReconciliation.js\';\n' + code;
    }
}

const newRoute = `
// Reconcile single stock
router.post('/reconcile/:id', async (req, res) => {
  try {
    const result = await reconcilePaperStock(req.params.id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
`;

if (!code.includes('/reconcile/:id')) {
    code = code.replace('export default router;', newRoute + '\nexport default router;');
    fs.writeFileSync('server/routes/paperStockRoutes.js', code);
    console.log('Route added.');
} else {
    console.log('Route already exists.');
}
