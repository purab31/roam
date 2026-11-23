const { z } = require('zod');

const dealerRegistrationSchema = z.object({
  dealershipName: z
    .string({ required_error: 'Dealership name is required' })
    .trim()
    .min(2, 'Dealership name must be at least 2 characters')
    .max(120, 'Dealership name cannot exceed 120 characters'),
  ownerName: z
    .string({ required_error: 'Owner name is required' })
    .trim()
    .min(2, 'Owner name must be at least 2 characters')
    .max(100, 'Owner name cannot exceed 100 characters'),
  businessEmail: z
    .string({ required_error: 'Business email is required' })
    .trim()
    .regex(/^\S+@\S+\.\S+$/, 'Please enter a valid business email address'),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .min(7, 'Phone number must be at least 7 characters'),
  address: z
    .string({ required_error: 'Address is required' })
    .trim()
    .min(5, 'Address must be at least 5 characters'),
  city: z
    .string({ required_error: 'City is required' })
    .trim()
    .min(2, 'City must be at least 2 characters'),
  pincode: z
    .string({ required_error: 'Pincode is required' })
    .trim()
    .min(3, 'Pincode must be at least 3 characters'),
  description: z.string().trim().max(2000).optional().default(''),
  logo: z.string().trim().nullable().optional(),
  registrationInfo: z
    .object({
      registrationNumber: z.string().trim().optional().default(''),
      taxId: z.string().trim().optional().default(''),
      state: z.string().trim().optional().default(''),
    })
    .optional()
    .default({}),
});

const updateDealerProfileSchema = z.object({
  dealershipName: z.string().trim().min(2).max(120).optional(),
  ownerName: z.string().trim().min(2).max(100).optional(),
  businessEmail: z.string().trim().regex(/^\S+@\S+\.\S+$/, 'Please enter a valid business email address').optional(),
  phone: z.string().trim().min(7).optional(),
  address: z.string().trim().min(5).optional(),
  city: z.string().trim().min(2).optional(),
  pincode: z.string().trim().min(3).optional(),
  description: z.string().trim().max(2000).optional(),
  logo: z.string().trim().nullable().optional(),
  registrationInfo: z
    .object({
      registrationNumber: z.string().trim().optional(),
      taxId: z.string().trim().optional(),
      state: z.string().trim().optional(),
    })
    .optional(),
});

const updateVerificationSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'changes_requested', 'suspended', 'revoked'], {
    errorMap: () => ({ message: 'Invalid verification status' }),
  }),
  notes: z.string().trim().optional().default(''),
});

const bulkStatusUpdateSchema = z.object({
  listingIds: z
    .array(z.string().min(1, 'Listing ID required'))
    .min(1, 'At least one listing ID is required'),
  action: z.enum(['activate', 'deactivate'], {
    errorMap: () => ({ message: 'Action must be activate or deactivate' }),
  }),
});

module.exports = {
  dealerRegistrationSchema,
  updateDealerProfileSchema,
  updateVerificationSchema,
  bulkStatusUpdateSchema,
};
