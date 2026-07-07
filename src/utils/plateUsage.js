export const PLATE_USAGE_STORAGE_KEY = 'krishnaPlateUsageCounts';

export const readPlateUsageMap = () => {
  try {
    return JSON.parse(localStorage.getItem(PLATE_USAGE_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

export const writePlateUsageMap = (map) => {
  localStorage.setItem(PLATE_USAGE_STORAGE_KEY, JSON.stringify(map));
};

export const buildPlateUsageMapFromCards = (cards) => {
  const map = {};
  cards.forEach((card) => {
    const size = String(card.plateSize || '').trim();
    if (!size) return;
    const cardsWithSize = cards.filter((c) => String(c.plateSize || '').trim() === size);
    const countByDocs = cardsWithSize.length;
    const maxUseCount = cardsWithSize.reduce(
      (max, c) => Math.max(max, Number(c.plateUseCount) || 0),
      0
    );
    map[size] = Math.max(countByDocs, maxUseCount);
  });
  return map;
};

export const mergePlateUsageMaps = (...maps) => {
  const merged = {};
  maps.forEach((map) => {
    Object.entries(map || {}).forEach(([size, count]) => {
      merged[size] = Math.max(merged[size] || 0, Number(count) || 0);
    });
  });
  return merged;
};

export const resolvePlateUseCount = (size, cards, editingCard) => {
  if (!size) return '';

  const normalizedSize = String(size).trim();
  const mergedMap = mergePlateUsageMaps(readPlateUsageMap(), buildPlateUsageMapFromCards(cards));
  writePlateUsageMap(mergedMap);

  const usedCount = mergedMap[normalizedSize] || 0;

  if (!editingCard) return usedCount + 1;
  if (String(editingCard.plateSize || '').trim() === normalizedSize) {
    return Math.max(usedCount, Number(editingCard.plateUseCount) || usedCount || 1);
  }
  return usedCount + 1;
};

export const rememberPlateUsage = (size, count) => {
  const normalizedSize = String(size || '').trim();
  const numericCount = Number(count);
  if (!normalizedSize || !numericCount) return;

  const map = readPlateUsageMap();
  map[normalizedSize] = Math.max(map[normalizedSize] || 0, numericCount);
  writePlateUsageMap(map);
};

export const syncPlateUsageFromCards = (cards) => {
  const mergedMap = mergePlateUsageMaps(readPlateUsageMap(), buildPlateUsageMapFromCards(cards));
  writePlateUsageMap(mergedMap);
  return mergedMap;
};
