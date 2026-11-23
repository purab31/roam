const { z } = require('zod');

const saleBaseSchema = z.object({
  enabled: z.boolean().default(true),
  askingPrice: z
    .number({ invalid_type_error: 'Asking price must be a number' })
    .int('Asking price must be an integer minor unit (paise)')
    .min(0, 'Asking price cannot be negative'),
  negotiable: z.boolean().default(false),
  minAcceptableOffer: z
    .number({ invalid_type_error: 'Minimum acceptable offer must be a number' })
    .int('Minimum acceptable offer must be an integer')
    .min(0, 'Minimum acceptable offer cannot be negative')
    .nullable()
    .optional(),
  description: z.string().trim().optional(),
  conditions: z.string().trim().optional(),
});

const saleSchema = saleBaseSchema.refine(
  data => {
    if (
      data.minAcceptableOffer !== undefined &&
      data.minAcceptableOffer !== null &&
      data.askingPrice !== undefined
    ) {
      return data.minAcceptableOffer <= data.askingPrice;
    }
    return true;
  },
  {
    message: 'Minimum acceptable offer cannot exceed asking price',
    path: ['minAcceptableOffer'],
  }
);

const rentalSchema = z.object({
  dailyPrice: z
    .number({ invalid_type_error: 'Daily price must be a number' })
    .int()
    .min(0, 'Daily price cannot be negative')
    .optional()
    .default(0),
  weeklyPrice: z
    .number({ invalid_type_error: 'Weekly price must be a number' })
    .int()
    .min(0, 'Weekly price cannot be negative')
    .optional()
    .default(0),
  otherPeriods: z.string().trim().optional(),
  securityDeposit: z
    .number({ invalid_type_error: 'Security deposit must be a number' })
    .int()
    .min(0, 'Security deposit cannot be negative')
    .optional()
    .default(0),
  minDays: z
    .number({ invalid_type_error: 'Minimum days must be a number' })
    .int()
    .min(1, 'Minimum rental duration must be at least 1 day')
    .optional()
    .default(1),
  maxDays: z
    .number({ invalid_type_error: 'Maximum days must be a number' })
    .int()
    .min(1)
    .optional()
    .default(30),
  availableFrom: z.string().datetime({ offset: true }).nullable().optional(),
  availableTo: z.string().datetime({ offset: true }).nullable().optional(),
  pickupLocation: z.string().trim().optional(),
  returnLocation: z.string().trim().optional(),
  driverIncluded: z.boolean().optional().default(false),
  mileageLimit: z.string().trim().optional(),
  fuelPolicy: z.string().trim().optional(),
  cancellationPolicy: z.string().trim().optional(),
  cancellationCutoffHours: z.coerce.number().min(0).optional().default(24),
  conditions: z.string().trim().optional(),
});

const createListingSchema = z
  .object({
    vehicleId: z.string().min(1, 'Vehicle ID is required'),
    purpose: z.enum(['sale', 'rent', 'both'], {
      errorMap: () => ({ message: 'Purpose must be sale, rent, or both' }),
    }),
    saveAsDraft: z.boolean().optional().default(false),
    sale: saleSchema.optional(),
    rental: rentalSchema.optional(),
  })
  .refine(
    data => {
      // If purpose includes sale, sale details with askingPrice are required
      if ((data.purpose === 'sale' || data.purpose === 'both') && !data.saveAsDraft) {
        return !!data.sale && data.sale.askingPrice !== undefined;
      }
      return true;
    },
    {
      message: 'Sale asking price is required when listing for sale',
      path: ['sale', 'askingPrice'],
    }
  )
  .refine(
    data => {
      // If purpose includes rent, dailyPrice is required when not saving as draft
      if ((data.purpose === 'rent' || data.purpose === 'both') && !data.saveAsDraft) {
        return !!data.rental && data.rental.dailyPrice !== undefined && data.rental.dailyPrice > 0;
      }
      return true;
    },
    {
      message: 'Daily rental price is required when listing for rent',
      path: ['rental', 'dailyPrice'],
    }
  );

const updateListingSchema = z.object({
  purpose: z.enum(['sale', 'rent', 'both']).optional(),
  sale: saleBaseSchema.partial().optional(),
  rental: rentalSchema.partial().optional(),
});

const patchStatusSchema = z
  .object({
    action: z.enum(['activate', 'deactivate', 'reserve', 'unreserve', 'sold', 'moderation']).optional(),
    status: z.string().optional(),
    target: z.enum(['sale', 'rental', 'moderation']).optional(),
    reason: z.string().trim().optional(),
  })
  .refine(
    data => !!data.action || !!data.status,
    { message: 'Either action or status must be specified' }
  );

const getPublicListingsQuerySchema = z.object({
  q: z.string().trim().optional(),
  purpose: z.enum(['sale', 'rent', 'both'], {
    errorMap: () => ({ message: 'Invalid purpose parameter' }),
  }).optional(),
  minPrice: z.coerce.number().min(0, 'minPrice must be non-negative').optional(),
  maxPrice: z.coerce.number().min(0, 'maxPrice must be non-negative').optional(),
  brand: z.string().trim().optional(),
  model: z.string().trim().optional(),
  yearFrom: z.coerce.number().int().min(1900).max(2100).optional(),
  yearTo: z.coerce.number().int().min(1900).max(2100).optional(),
  fuel: z.enum(['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG', 'LPG'], {
    errorMap: () => ({ message: 'Invalid fuel parameter' }),
  }).optional(),
  transmission: z.enum(['Manual', 'Automatic'], {
    errorMap: () => ({ message: 'Invalid transmission parameter' }),
  }).optional(),
  bodyType: z.enum([
    'SUV',
    'Sedan',
    'Hatchback',
    'Truck',
    'Luxury',
    'Coupe',
    'Convertible',
    'Minivan',
    'Wagon',
    'Van',
    'Other',
  ], {
    errorMap: () => ({ message: 'Invalid bodyType parameter' }),
  }).optional(),
  kmMin: z.coerce.number().min(0, 'kmMin must be non-negative').optional(),
  kmMax: z.coerce.number().min(0, 'kmMax must be non-negative').optional(),
  owners: z.coerce.number().int().min(0).optional(),
  sellerType: z.enum(['individual', 'dealer'], {
    errorMap: () => ({ message: 'Invalid sellerType parameter' }),
  }).optional(),
  city: z.string().trim().optional(),
  area: z.string().trim().optional(),
  pincode: z.string().trim().optional(),
  condition: z.enum(['Excellent', 'Very Good', 'Good', 'Fair', 'Needs Work'], {
    errorMap: () => ({ message: 'Invalid condition parameter' }),
  }).optional(),
  sort: z.enum(
    ['priceAsc', 'priceDesc', 'recentlyListed', 'recentlyUpdated', 'year', 'lowestKm'],
    { errorMap: () => ({ message: 'Invalid sort parameter' }) }
  ).optional(),
  availableFrom: z.string().datetime({ offset: true }).optional(),
  availableTo: z.string().datetime({ offset: true }).optional(),
  availableNow: z.union([z.boolean(), z.string().transform(v => v === 'true')]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

module.exports = {
  createListingSchema,
  updateListingSchema,
  patchStatusSchema,
  getPublicListingsQuerySchema,
};
