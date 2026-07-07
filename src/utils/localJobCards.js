const LOCAL_JOB_CARDS_KEY = 'krishnaLocalJobCards';

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

export const saveLocalJobCard = (card) => {
  const now = new Date().toISOString();
  const id = card._id || `local-${Date.now()}`;
  const savedCard = {
    ...card,
    _id: id,
    jobNumber: card.jobNumber || `LOCAL-${String(Date.now()).slice(-6)}`,
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
