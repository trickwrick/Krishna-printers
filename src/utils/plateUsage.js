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

export const normalizeParty = (name) => String(name || '').trim().toLowerCase();

export const resolvePlateUseCount = (size, cards = [], editingCard = null, partyName = '') => {
  if (!size) return 1;

  const normalizedSize = String(size).trim().toLowerCase();
  const targetParty = normalizeParty(partyName || editingCard?.partyName || editingCard?.companyName);

  // If no party name is provided yet, default to 1st time
  if (!targetParty) return 1;

  // Find all cards for THIS party that used this plate size
  const matchingPartyCards = cards.filter((c) => {
    // Ignore current editing card if updating
    if (editingCard?._id && String(c._id) === String(editingCard._id)) return false;
    if (editingCard?.jobNumber && c.jobNumber && String(c.jobNumber) === String(editingCard.jobNumber)) return false;

    const cParty = normalizeParty(c.partyName || c.companyName);
    if (cParty !== targetParty) return false;

    // Check if card used this size
    const cardPlateSize = String(c.plateSize || '').toLowerCase();
    const cardPlateDetails = String(c.plateDetails || '').toLowerCase();

    return cardPlateSize.includes(normalizedSize) || cardPlateDetails.includes(normalizedSize);
  });

  const previousCount = matchingPartyCards.length;

  // If editing an existing card, preserve its count or calculate based on position
  if (editingCard && editingCard._id) {
    if (editingCard.plateUseCount) {
      // If editing card already has plateUseCount string like "530x650: 2"
      const match = String(editingCard.plateUseCount).match(new RegExp(`${size}[:\\s]+(\\d+)`, 'i'));
      if (match && match[1]) {
        return Number(match[1]);
      }
    }
  }

  // Next usage count for this party is previousCount + 1
  return previousCount + 1;
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
