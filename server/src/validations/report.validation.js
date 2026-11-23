const { z } = require('zod');

const createReportSchema = z.object({
  subjectType: z.enum(['listing', 'user', 'dealer'], {
    errorMap: () => ({ message: 'subjectType must be listing, user, or dealer' }),
  }),
  subjectRef: z
    .string({ required_error: 'subjectRef is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid subjectRef ObjectId'),
  category: z.enum(
    [
      'misleading',
      'fraud',
      'inappropriate_media',
      'suspicious_account',
      'misleading_dealer',
      'other',
    ],
    { errorMap: () => ({ message: 'Invalid report category' }) }
  ),
  description: z
    .string({ required_error: 'Report description is required' })
    .trim()
    .min(5, 'Report description must be at least 5 characters')
    .max(2000, 'Report description cannot exceed 2000 characters'),
});

const resolveReportSchema = z.object({
  status: z.enum(['resolved', 'dismissed', 'in_review'], {
    errorMap: () => ({ message: 'Resolution status must be resolved, dismissed, or in_review' }),
  }),
  resolutionNote: z.string().trim().max(2000).optional().default(''),
});

module.exports = {
  createReportSchema,
  resolveReportSchema,
};
