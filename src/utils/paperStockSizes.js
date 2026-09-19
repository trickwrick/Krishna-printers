const STORAGE_KEY = 'paperStockSizes';

export const rememberPaperSizes = (id, coverPaperSize, innerPaperSize) => {
  if (!id) return;
  const cache = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  cache[id] = {
    coverPaperSize: coverPaperSize || '',
    innerPaperSize: innerPaperSize || '',
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
};

export const mergePaperSizes = (stocks = []) => {
  if (!Array.isArray(stocks)) return [];
  const cache = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  return stocks.map((stock) => ({
    ...stock,
    coverPaperSize: stock?.coverPaperSize || cache[stock?._id]?.coverPaperSize || '',
    innerPaperSize: stock?.innerPaperSize || cache[stock?._id]?.innerPaperSize || '',
  }));
};
