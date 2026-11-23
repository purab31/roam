/**
 * Money helper for Roam marketplace (Client ESM module).
 * All monetary amounts are stored in the database as non-negative integer minor units (paise).
 * 1 Rupee = 100 Paise.
 */

export function rupeesToPaise(rupees) {
  if (rupees === null || rupees === undefined || rupees === '') {
    throw new TypeError('Rupees amount is required');
  }

  const num = typeof rupees === 'string' ? Number(rupees) : rupees;

  if (typeof num !== 'number' || Number.isNaN(num)) {
    throw new TypeError('Rupees amount must be a valid number');
  }

  if (num < 0) {
    throw new RangeError('Rupees amount cannot be negative');
  }

  return Math.round(num * 100);
}

export function paiseToRupees(paise) {
  if (paise === null || paise === undefined || paise === '') {
    return 0;
  }

  const num = Number(paise);

  if (typeof num !== 'number' || Number.isNaN(num)) {
    throw new TypeError('Paise amount must be a valid number');
  }

  if (num < 0) {
    throw new RangeError('Paise amount cannot be negative');
  }

  return Math.round(num) / 100;
}

export function formatRupees(paise, options = {}) {
  const { showDecimals = false, symbol = true } = options;
  const rupees = paiseToRupees(paise);

  const formatted = rupees.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });

  return symbol ? `₹${formatted}` : formatted;
}
