const { z } = require('zod');

const updateSettingsSchema = z.object({
  dealerVerificationRequired: z.boolean().optional(),
  listingExpiryDays: z
    .number()
    .int()
    .min(1, 'Listing expiry days must be at least 1')
    .max(365, 'Listing expiry days cannot exceed 365')
    .optional(),
  categories: z
    .array(z.string().trim().min(1, 'Category name cannot be empty'))
    .min(1, 'At least one category is required')
    .optional(),
  announcementBar: z
    .object({
      message1: z.string().trim().max(200, 'Message 1 cannot exceed 200 characters').optional().default(''),
      message2: z.string().trim().max(200, 'Message 2 cannot exceed 200 characters').optional().default(''),
      linkText: z.string().trim().max(50, 'Link text cannot exceed 50 characters').optional().default(''),
      linkUrl: z
        .string()
        .trim()
        .max(500, 'Link URL cannot exceed 500 characters')
        .refine(
          url => !url || url.startsWith('/') || url.startsWith('https://'),
          'Link URL must start with / (internal) or https://'
        )
        .optional()
        .default(''),
    })
    .optional(),
});

module.exports = {
  updateSettingsSchema,
};
