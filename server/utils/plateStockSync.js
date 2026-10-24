import PlateStock from '../models/PlateStock.js';
import PlateStockTransaction from '../models/PlateStockTransaction.js';

// Sync plate usage whenever a Job Card is created, updated, or deleted
export const syncPlateStockWithJob = async (jobCard, oldJobCard = null) => {
  try {
    if (!jobCard) return;

    // Helper to extract plates and quantities from a Job Card
    const extractPlateUsages = (job) => {
      if (!job) return [];
      const usages = [];
      const plateSource = job.plateSource || (job.plateFrom === 'Party Plate' ? 'Party plate' : 'Company plate');

      // Check if there are plateDetails (JSON string with per-size details)
      if (job.plateDetails) {
        try {
          const parsed = typeof job.plateDetails === 'string' ? JSON.parse(job.plateDetails) : job.plateDetails;
          Object.entries(parsed).forEach(([size, info]) => {
            // Deduct if it's a new plate or if plateType is not old plate
            const isNewPlate = !info.type || info.type.toLowerCase().includes('new');
            if (isNewPlate) {
              const qty = Number(info.qty) || 1;
              if (qty > 0) {
                usages.push({
                  size: String(size).trim(),
                  qty,
                  plateSource
                });
              }
            }
          });
        } catch {
          // ignore json parse error
        }
      }

      // If no details parsed but plateSize exists
      if (usages.length === 0 && job.plateSize) {
        const sizes = String(job.plateSize).split(',').map(s => s.trim()).filter(Boolean);
        const totalQty = Number(job.plateQty) || sizes.length || 1;
        const qtyPerSize = Math.max(1, Math.floor(totalQty / sizes.length));
        sizes.forEach(size => {
          usages.push({
            size,
            qty: qtyPerSize,
            plateSource
          });
        });
      }

      return usages;
    };

    const newUsages = extractPlateUsages(jobCard);
    const oldUsages = extractPlateUsages(oldJobCard);

    // Build diff
    const map = {};
    oldUsages.forEach(u => {
      const key = `${u.size}_${u.plateSource}`.toLowerCase();
      map[key] = { size: u.size, plateSource: u.plateSource, delta: -(Number(u.qty) || 0) };
    });

    newUsages.forEach(u => {
      const key = `${u.size}_${u.plateSource}`.toLowerCase();
      if (!map[key]) {
        map[key] = { size: u.size, plateSource: u.plateSource, delta: 0 };
      }
      map[key].delta += (Number(u.qty) || 0);
    });

    for (const key of Object.keys(map)) {
      const { size, plateSource, delta } = map[key];
      if (!delta) continue;

      // Find matching plate stock
      const escapedSize = size.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const sizeRegex = new RegExp(`^${escapedSize}$`, 'i');

      const stock = await PlateStock.findOne({
        $or: [{ size: sizeRegex }, { plateName: sizeRegex }],
        plateSource: plateSource || 'Company plate'
      });

      if (!stock) {
        continue;
      }

      // Delta > 0 means job requires more plates => decrease stock
      // Delta < 0 means job reduced plate usage => return stock
      stock.quantity = Math.max(0, (stock.quantity || 0) - delta);
      await stock.save();

      await PlateStockTransaction.create({
        plateStockId: stock._id,
        plateName: stock.plateName,
        transactionType: delta > 0 ? 'deduct' : 'add',
        quantity: Math.abs(delta),
        partyName: jobCard.partyName || '',
        jobNumber: jobCard.jobNumber || '',
        jobCardId: jobCard._id,
        plateSource: stock.plateSource,
        balanceAfter: stock.quantity,
        note: `Job Card ${delta > 0 ? 'Usage' : 'Restoration'} (#${jobCard.jobNumber || ''})`
      });
    }
  } catch (err) {
    console.error('⚠️ Plate stock sync error:', err.message);
  }
};
