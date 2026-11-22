const { z } = require('zod');

const mobileRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}$/;

const registerSchema = z
  .object({
    fullName: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name cannot exceed 100 characters'),
    email: z
      .string({ required_error: 'Email address is required' })
      .trim()
      .toLowerCase()
      .email('Please enter a valid email address'),
    mobile: z
      .string({ required_error: 'Mobile number is required' })
      .trim()
      .regex(mobileRegex, 'Please enter a valid mobile number (e.g. +1234567890)'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long'),
    passwordConfirm: z.string().optional(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms and conditions' }),
    }),
    capabilities: z
      .array(z.enum(['buyer', 'renter', 'seller', 'dealer']))
      .optional(),
  })
  .refine(
    data => {
      if (data.passwordConfirm) {
        return data.password === data.passwordConfirm;
      }
      return true;
    },
    {
      message: 'Passwords do not match',
      path: ['passwordConfirm'],
    }
  );

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string({ required_error: 'Reset token is required' }),
  password: z
    .string({ required_error: 'New password is required' })
    .min(8, 'Password must be at least 8 characters long'),
});

const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters')
    .optional(),
  mobile: z
    .string()
    .trim()
    .regex(mobileRegex, 'Please enter a valid mobile number')
    .optional(),
  contactVisibility: z
    .object({
      email: z.boolean().optional(),
      mobile: z.boolean().optional(),
    })
    .optional(),
  profilePhoto: z.string().nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: 'Current password is required' })
    .min(1, 'Current password is required'),
  newPassword: z
    .string({ required_error: 'New password is required' })
    .min(8, 'New password must be at least 8 characters long'),
});

const addCapabilitySchema = z.object({
  capability: z.enum(['buyer', 'renter', 'seller', 'dealer'], {
    errorMap: () => ({
      message: 'Capability must be one of: buyer, renter, seller, dealer',
    }),
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
  addCapabilitySchema,
};
