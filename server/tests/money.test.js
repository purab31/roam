const { rupeesToPaise, paiseToRupees, formatRupees } = require('../src/utils/money');

describe('Money Helper (Rupees <-> Paise)', () => {
  describe('rupeesToPaise', () => {
    it('should correctly convert whole rupees to integer paise', () => {
      expect(rupeesToPaise(500000)).toBe(50000000);
      expect(rupeesToPaise('500000')).toBe(50000000);
      expect(rupeesToPaise(0)).toBe(0);
    });

    it('should handle fractional rupee amounts with rounding', () => {
      expect(rupeesToPaise(125.5)).toBe(12550);
      expect(rupeesToPaise(99.99)).toBe(9999);
      expect(rupeesToPaise(10.004)).toBe(1000);
    });

    it('should reject negative values with RangeError', () => {
      expect(() => rupeesToPaise(-100)).toThrow(RangeError);
      expect(() => rupeesToPaise('-50')).toThrow(RangeError);
    });

    it('should reject invalid or missing values with TypeError', () => {
      expect(() => rupeesToPaise(null)).toThrow(TypeError);
      expect(() => rupeesToPaise(undefined)).toThrow(TypeError);
      expect(() => rupeesToPaise('abc')).toThrow(TypeError);
      expect(() => rupeesToPaise('')).toThrow(TypeError);
    });
  });

  describe('paiseToRupees', () => {
    it('should correctly convert integer paise to rupees', () => {
      expect(paiseToRupees(50000000)).toBe(500000);
      expect(paiseToRupees(12550)).toBe(125.5);
      expect(paiseToRupees(0)).toBe(0);
      expect(paiseToRupees(null)).toBe(0);
      expect(paiseToRupees('')).toBe(0);
    });

    it('should reject negative paise with RangeError', () => {
      expect(() => paiseToRupees(-500)).toThrow(RangeError);
    });

    it('should reject invalid values with TypeError', () => {
      expect(() => paiseToRupees('invalid')).toThrow(TypeError);
    });
  });

  describe('formatRupees', () => {
    it('should format paise into Indian Rupee string', () => {
      expect(formatRupees(15000000)).toBe('₹1,50,000');
      expect(formatRupees(50000000)).toBe('₹5,00,000');
      expect(formatRupees(12550, { showDecimals: true })).toBe('₹125.50');
      expect(formatRupees(15000000, { symbol: false })).toBe('1,50,000');
    });
  });
});
