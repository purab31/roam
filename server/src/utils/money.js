/**
 * Money helper for Roam marketplace.
 * All monetary amounts are stored in the database as non-negative integer minor units (paise).
 * 1 Rupee = 100 Paise.
 */

/**
 * Converts rupees (number or numeric string) to integer paise.
 * Throws a TypeError/RangeError if the amount is negative or invalid.
 * @param {number|string} rupees
 * @returns {number} Integer paise
 */
function rupeesToPaise(rupees) {
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

/**
 * Converts paise (integer) to rupees (number).
 * @param {number} paise
 * @returns {number} Rupees
 */
function paiseToRupees(paise) {
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

/**
 * Formats integer paise as standard Indian currency string (INR).
 * E.g. 15000000 paise -> "₹1,50,000"
 * @param {number} paise
 * @param {Object} [options]
 * @param {boolean} [options.showDecimals=false]
 * @param {boolean} [options.symbol=true]
 * @returns {string}
 */
function formatRupees(paise, options = {}) {
  const { showDecimals = false, symbol = true } = options;
  const rupees = paiseToRupees(paise);

  const formatted = rupees.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });

  return symbol ? `₹${formatted}` : formatted;
}

module.exports = {
  rupeesToPaise,
  paiseToRupees,
  formatRupees,
};
