const { z } = require('zod');

const moderateListingSchema = z.object({
  action: z.enum(['approve', 'reject', 'request_corrections', 'deactivate', 'remove'], {
    errorMap: () => ({
      message: 'Action must be approve, reject, request_corrections, deactivate, or remove',
    }),
  }),
  reason: z.string().trim().max(1000).optional().default(''),
});

const blockUserSchema = z.object({
  reason: z
    .string({ required_error: 'A reason for blocking the account is required' })
    .trim()
    .min(2, 'Blocking reason must be at least 2 characters')
    .max(1000, 'Blocking reason cannot exceed 1000 characters'),
});

const unblockUserSchema = z.object({
  reason: z.string().trim().max(1000).optional().default(''),
});

module.exports = {
  moderateListingSchema,
  blockUserSchema,
  unblockUserSchema,
};
