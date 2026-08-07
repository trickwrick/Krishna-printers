const LOCAL_JOB_CARDS_KEY = 'krishnaLocalJobCards';
const LOCAL_JOB_COUNTER_KEY = 'krishnaLocalJobCounter';

export const readLocalJobCards = () => {
  try {
    const data = JSON.parse(localStorage.getItem(LOCAL_JOB_CARDS_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const writeLocalJobCards = (cards) => {
  localStorage.setItem(LOCAL_JOB_CARDS_KEY, JSON.stringify(cards));
};

// Generate next JOBKP-XXXX number
const generateJobKPNumber = () => {
  const cards = readLocalJobCards();

  // Find the highest existing JOBKP number
  let maxNum = 0;
  cards.forEach((card) => {
    const match = (card.jobNumber || '').match(/^JOBKP-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  // Also check the stored counter
  const storedCounter = parseInt(localStorage.getItem(LOCAL_JOB_COUNTER_KEY) || '0', 10);
  const nextNum = Math.max(maxNum, storedCounter) + 1;

  localStorage.setItem(LOCAL_JOB_COUNTER_KEY, String(nextNum));
  return `JOBKP-${String(nextNum).padStart(4, '0')}`;
};

// One-time migration: rename existing LOCAL-XXXXXX cards to JOBKP-XXXX
export const migrateLocalJobNumbers = () => {
  const cards = readLocalJobCards();
  let changed = false;
  let counter = 0;

  // Find highest existing JOBKP number first
  cards.forEach((card) => {
    const match = (card.jobNumber || '').match(/^JOBKP-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > counter) counter = num;
    }
  });

  const migrated = cards.map((card) => {
    if ((card.jobNumber || '').startsWith('LOCAL-')) {
      counter += 1;
      changed = true;
      return {
        ...card,
        jobNumber: `JOBKP-${String(counter).padStart(4, '0')}`,
      };
    }
    return card;
  });

  if (changed) {
    localStorage.setItem(LOCAL_JOB_COUNTER_KEY, String(counter));
    writeLocalJobCards(migrated);
  }
};

export const saveLocalJobCard = (card) => {
  const now = new Date().toISOString();
  const id = card._id || `local-${Date.now()}`;
  const savedCard = {
    ...card,
    _id: id,
    jobNumber: card.jobNumber || generateJobKPNumber(),
    createdAt: card.createdAt || now,
    updatedAt: now,
    localOnly: true,
  };

  const cards = readLocalJobCards();
  const idx = cards.findIndex((item) => item._id === id || item.jobNumber === savedCard.jobNumber);
  if (idx >= 0) {
    cards[idx] = { ...cards[idx], ...savedCard };
  } else {
    cards.unshift(savedCard);
  }
  writeLocalJobCards(cards);
  return savedCard;
};

export const deleteLocalJobCard = (id) => {
  writeLocalJobCards(readLocalJobCards().filter((card) => card._id !== id));
};

export const mergeWithLocalJobCards = (serverCards = []) => {
  const merged = new Map();
  (Array.isArray(serverCards) ? serverCards : []).forEach((card) => {
    merged.set(card._id || card.jobNumber, card);
  });
  readLocalJobCards().forEach((card) => {
    merged.set(card._id || card.jobNumber, card);
  });
  return Array.from(merged.values());
};

export const updateLocalJobCardField = (id, updates) => {
  const cards = readLocalJobCards();
  const idx = cards.findIndex((item) => item._id === id || item.jobNumber === id);
  if (idx >= 0) {
    cards[idx] = { ...cards[idx], ...updates, updatedAt: new Date().toISOString() };
    writeLocalJobCards(cards);
    return cards[idx];
  }
  return null;
};
