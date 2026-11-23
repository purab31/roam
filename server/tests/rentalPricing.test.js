const { calculateRentalEstimate } = require('../src/services/rentalPricing');

describe('calculateRentalEstimate (Rental Pricing Engine)', () => {
  const baseListing = {
    rental: {
      dailyPrice: 100000, // ₹1,000 / day in paise
      weeklyPrice: 600000, // ₹6,000 / week in paise (cheaper than 7 * 1,000 = 7,000)
      securityDeposit: 500000, // ₹5,000 deposit
    },
  };

  test('calculates pure daily rate for duration < 7 days when weekly is not cheaper', () => {
    const start = '2026-12-01T10:00:00.000Z';
    const end = '2026-12-04T10:00:00.000Z'; // 3 days
    const result = calculateRentalEstimate(baseListing, start, end);

    expect(result.days).toBe(3);
    expect(result.baseRate).toBe(300000); // 3 * ₹1,000 = ₹3,000
    expect(result.deposit).toBe(500000);
    expect(result.estimatedTotal).toBe(800000); // ₹3,000 + ₹5,000
    expect(result.breakdown.strategy).toBe('daily');
  });

  test('chooses full week rate when renting exactly 7 days', () => {
    const start = '2026-12-01T10:00:00.000Z';
    const end = '2026-12-08T10:00:00.000Z'; // 7 days
    const result = calculateRentalEstimate(baseListing, start, end);

    expect(result.days).toBe(7);
    expect(result.baseRate).toBe(600000); // ₹6,000 (weekly rate) instead of 700000
    expect(result.estimatedTotal).toBe(1100000); // 600000 + 500000
    expect(result.breakdown.strategy).toBe('weekly_plus_daily');
  });

  test('chooses weekly rate if 6 days at daily (₹6,000) matches or is more expensive than 1 week (round_up_weeks)', () => {
    const customListing = {
      rental: {
        dailyPrice: 120000, // ₹1,200 / day
        weeklyPrice: 600000, // ₹6,000 / week
        securityDeposit: 200000,
      },
    };
    // 6 days * 1,200 = ₹7,200, but 1 week = ₹6,000!
    const start = '2026-12-01T10:00:00.000Z';
    const end = '2026-12-07T10:00:00.000Z'; // 6 days
    const result = calculateRentalEstimate(customListing, start, end);

    expect(result.days).toBe(6);
    expect(result.baseRate).toBe(600000); // should pick ₹6,000
    expect(result.breakdown.strategy).toBe('round_up_weeks');
  });

  test('combines weeks and remainder days correctly (e.g. 10 days = 1 week + 3 days)', () => {
    const start = '2026-12-01T10:00:00.000Z';
    const end = '2026-12-11T10:00:00.000Z'; // 10 days
    const result = calculateRentalEstimate(baseListing, start, end);

    expect(result.days).toBe(10);
    // 1 week (600,000) + 3 days (300,000) = 900,000
    // vs 10 * 100,000 = 1,000,000
    // vs 2 weeks = 1,200,000
    expect(result.baseRate).toBe(900000);
    expect(result.breakdown.strategy).toBe('weekly_plus_daily');
  });

  test('handles listings with no weekly price (pure daily)', () => {
    const dailyOnlyListing = {
      rental: {
        dailyPrice: 150000, // ₹1,500
        weeklyPrice: 0,
        securityDeposit: 300000,
      },
    };
    const start = '2026-12-01T10:00:00.000Z';
    const end = '2026-12-15T10:00:00.000Z'; // 14 days
    const result = calculateRentalEstimate(dailyOnlyListing, start, end);

    expect(result.days).toBe(14);
    expect(result.baseRate).toBe(14 * 150000);
    expect(result.breakdown.strategy).toBe('daily');
  });

  test('throws error if return date is on or before pickup date', () => {
    const start = '2026-12-05T10:00:00.000Z';
    const end = '2026-12-05T10:00:00.000Z';

    expect(() => calculateRentalEstimate(baseListing, start, end)).toThrow(
      'Return date must be strictly after pickup date'
    );
  });
});
