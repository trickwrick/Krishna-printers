
const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  const word = TENS[Math.floor(n / 10)];
  const rest = n % 10 ? ` ${ONES[n % 10]}` : '';
  return `${word}${rest}`.trim();
}

function threeDigits(n) {
  if (n === 0) return '';
  let result = '';
  if (n >= 100) {
    result += `${ONES[Math.floor(n / 100)]} Hundred`;
    n %= 100;
    if (n) result += ' ';
  }
  if (n) result += twoDigits(n);
  return result.trim();
}

function convertInteger(n) {
  if (n === 0) return '';
  let result = '';

  if (n >= 10000000) {
    result += `${convertInteger(Math.floor(n / 10000000))} Crore `;
    n %= 10000000;
  }
  if (n >= 100000) {
    result += `${threeDigits(Math.floor(n / 100000))} Lakh `;
    n %= 100000;
  }
  if (n >= 1000) {
    result += `${threeDigits(Math.floor(n / 1000))} Thousand `;
    n %= 1000;
  }
  if (n > 0) {
    result += threeDigits(n);
  }

  return result.trim();
}

/**
 * Convert amount to Indian currency words (Rupees / Paise).
 * @param {number|string} amount
 * @returns {string}
 */
export function numberToWords(amount) {
  const num = Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
  if (!Number.isFinite(num) || num < 0) return '';
  if (num === 0) return 'Zero Rupees';

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let result = '';
  if (rupees > 0) {
    result = `${convertInteger(rupees)} Rupees`;
  }
  if (paise > 0) {
    if (result) result += ' and ';
    result += `${convertInteger(paise)} Paise`;
  }

  return result || 'Zero Rupees';
}

export const NumberToWords = numberToWords;
