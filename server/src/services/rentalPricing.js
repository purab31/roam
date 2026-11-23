/**
 * Calculates rental estimate for a vehicle listing over a given date range.
 *
 * PRICING COMBINATION RULE:
 * 1. Calculates the duration in calendar days (difference in milliseconds divided by 24h, rounded up, minimum 1 day).
 * 2. Compares all valid pricing options:
 *    - All daily: `days * dailyPrice`
 *    - Full weeks + remaining days: `Math.floor(days / 7) * weeklyPrice + (days % 7) * dailyPrice` (if weeklyPrice > 0)
 *    - Round up to full weeks: `Math.ceil(days / 7) * weeklyPrice` (if weeklyPrice > 0)
 * 3. Chooses the minimum (cheapest valid combination) to ensure fair, transparent renter pricing.
 * 4. Adds security deposit and optional additional charges to calculate the estimatedTotal,
 *    keeping the deposit clearly identified as refundable.
 *
 * @param {Object} listing - Listing model or plain object containing rental subdocument
 * @param {Date|string} start - Rental start date
 * @param {Date|string} end - Rental end date
 * @param {Object} [options] - Optional additional charges (e.g. driver fee)
 * @returns {Object} { baseRate, days, additionalCharges, deposit, estimatedTotal, breakdown }
 */
function calculateRentalEstimate(listing, start, end, options = {}) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date provided to calculateRentalEstimate');
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs <= 0) {
    throw new Error('Return date must be strictly after pickup date');
  }

  // Duration in days (ceil handles fractional days / hours)
  const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const rental = listing.rental || {};
  const dailyPrice = Number(rental.dailyPrice) || 0;
  const weeklyPrice = Number(rental.weeklyPrice) || 0;
  const deposit = Number(rental.securityDeposit) || 0;
  const additionalCharges = Number(options.additionalCharges) || 0;

  // Compute pricing options
  const costDailyOnly = days * dailyPrice;
  let chosenBaseRate = costDailyOnly;
  let chosenStrategy = 'daily';

  if (weeklyPrice > 0) {
    const fullWeeks = Math.floor(days / 7);
    const remainderDays = days % 7;
    const costWeeklyAndRemainder = fullWeeks * weeklyPrice + remainderDays * dailyPrice;
    const costCeilWeeks = Math.ceil(days / 7) * weeklyPrice;

    if (costWeeklyAndRemainder < chosenBaseRate) {
      chosenBaseRate = costWeeklyAndRemainder;
      chosenStrategy = 'weekly_plus_daily';
    }
    if (costCeilWeeks < chosenBaseRate) {
      chosenBaseRate = costCeilWeeks;
      chosenStrategy = 'round_up_weeks';
    }
  }

  const estimatedTotal = chosenBaseRate + deposit + additionalCharges;

  return {
    baseRate: chosenBaseRate,
    days,
    additionalCharges,
    deposit,
    estimatedTotal,
    breakdown: {
      strategy: chosenStrategy,
      dailyPrice,
      weeklyPrice,
      days,
    },
  };
}

module.exports = {
  calculateRentalEstimate,
};
