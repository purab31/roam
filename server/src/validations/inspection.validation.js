const { z } = require('zod');

const createInspectionSchema = z.object({
  listingId: z.string().min(1, 'Listing ID is required'),
  preferredDateTime: z
    .string()
    .datetime({ message: 'Preferred date and time must be a valid ISO datetime string' })
    .refine(
      val => new Date(val).getTime() > Date.now(),
      'Preferred inspection date and time must be in the future'
    ),
  message: z.string().max(500, 'Message cannot exceed 500 characters').optional().default(''),
});

const respondInspectionSchema = z.object({
  action: z.enum(['accept', 'reject', 'reschedule'], {
    errorMap: () => ({ message: "Action must be 'accept', 'reject', or 'reschedule'" }),
  }),
  proposedAlternative: z
    .string()
    .datetime({ message: 'Proposed alternative must be a valid ISO datetime string' })
    .optional()
    .refine(
      val => !val || new Date(val).getTime() > Date.now(),
      'Proposed alternative date and time must be in the future'
    ),
  alternativeMessage: z
    .string()
    .max(500, 'Alternative message cannot exceed 500 characters')
    .optional()
    .default(''),
});

const updateInspectionStatusSchema = z.object({
  action: z.enum(['cancel', 'complete', 'accept_reschedule', 'reject_reschedule'], {
    errorMap: () => ({
      message: "Action must be 'cancel', 'complete', 'accept_reschedule', or 'reject_reschedule'",
    }),
  }),
  note: z.string().max(500).optional().default(''),
});

module.exports = {
  createInspectionSchema,
  respondInspectionSchema,
  updateInspectionStatusSchema,
};
