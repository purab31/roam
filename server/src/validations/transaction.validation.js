const { z } = require('zod');

const createTransactionSchema = z.object({
  offerId: z.string({ required_error: 'Offer ID is required' }).regex(/^[0-9a-fA-F]{24}$/, 'Invalid offer ID format'),
  finalAmount: z
    .number({ invalid_type_error: 'Final amount must be a number' })
    .int('Final amount must be an integer minor unit (paise)')
    .min(100, 'Final amount must be at least 100 paise'),
  notes: z.string().trim().max(1000).optional().default(''),
});

const createAcquisitionSchema = z.object({
  offerId: z.string({ required_error: 'Offer ID is required' }).regex(/^[0-9a-fA-F]{24}$/, 'Invalid offer ID format'),
  notes: z.string().trim().max(1000).optional().default(''),
});

const updateAcquisitionStatusSchema = z.object({
  action: z.enum(['confirm', 'cancel', 'acquired', 'cancelled'], {
    errorMap: () => ({ message: 'Action must be confirm, cancel, acquired, or cancelled' }),
  }),
  notes: z.string().trim().max(1000).optional().default(''),
});

module.exports = {
  createTransactionSchema,
  createAcquisitionSchema,
  updateAcquisitionStatusSchema,
};
