const { z } = require('zod');

const createOfferSchema = z.object({
  listingId: z.string({ required_error: 'Listing ID is required' }).regex(/^[0-9a-fA-F]{24}$/, 'Invalid listing ID format'),
  amount: z
    .number({ invalid_type_error: 'Offer amount must be a number' })
    .int('Offer amount must be an integer minor unit (paise)')
    .min(100, 'Offer amount must be at least 100 paise'),
  message: z.string().trim().max(3000, 'Message cannot exceed 3000 characters').optional().default(''),
});

const counterOfferSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Counter offer amount must be a number' })
    .int('Counter offer amount must be an integer minor unit (paise)')
    .min(100, 'Counter offer amount must be at least 100 paise'),
  message: z.string().trim().max(3000, 'Message cannot exceed 3000 characters').optional().default(''),
});

const patchOfferStatusSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'withdrawn'], {
    errorMap: () => ({ message: 'Status must be one of: accepted, rejected, withdrawn' }),
  }),
  message: z.string().trim().max(1000).optional().default(''),
});

module.exports = {
  createOfferSchema,
  counterOfferSchema,
  patchOfferStatusSchema,
};
