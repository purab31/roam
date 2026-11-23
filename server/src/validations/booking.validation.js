const { z } = require('zod');

const createBookingSchema = z
  .object({
    listingId: z.string().min(1, 'Listing ID is required'),
    startDate: z.string().datetime({ offset: true, message: 'Valid startDate datetime is required' }),
    endDate: z.string().datetime({ offset: true, message: 'Valid endDate datetime is required' }),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine(
    data => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end.getTime() > start.getTime();
    },
    {
      message: 'Return date must be strictly after pickup date',
      path: ['endDate'],
    }
  );

const patchBookingStatusSchema = z
  .object({
    action: z
      .enum(['accept', 'reject', 'cancel', 'activate', 'handover', 'complete', 'return'])
      .optional(),
    status: z
      .enum([
        'requested',
        'pending',
        'confirmed',
        'rejected',
        'cancelled',
        'active',
        'completed',
        'modification_requested',
      ])
      .optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .refine(data => !!data.action || !!data.status, {
    message: 'Either action or status must be specified',
  });

const bookingModificationSchema = z
  .object({
    startDate: z.string().datetime({ offset: true }).optional(),
    endDate: z.string().datetime({ offset: true }).optional(),
    action: z.enum(['approve', 'reject']).optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .refine(
    data => {
      const hasDates = !!data.startDate && !!data.endDate;
      const hasAction = !!data.action;
      return hasDates || hasAction;
    },
    {
      message: 'Either new dates (startDate & endDate) or an action (approve | reject) must be provided',
    }
  )
  .refine(
    data => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate).getTime() > new Date(data.startDate).getTime();
      }
      return true;
    },
    {
      message: 'Return date must be strictly after pickup date',
      path: ['endDate'],
    }
  );

const createUnavailableDateSchema = z
  .object({
    startDate: z.string().datetime({ offset: true, message: 'Valid startDate datetime is required' }),
    endDate: z.string().datetime({ offset: true, message: 'Valid endDate datetime is required' }),
    reason: z.string().trim().max(250).optional(),
  })
  .refine(
    data => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end.getTime() > start.getTime();
    },
    {
      message: 'End date must be strictly after start date',
      path: ['endDate'],
    }
  );

const getBookingsQuerySchema = z.object({
  role: z.enum(['renter', 'owner', 'dealer', 'admin']).optional(),
  view: z.enum(['upcoming', 'active', 'completed', 'cancelled']).optional(),
  status: z
    .enum([
      'requested',
      'pending',
      'confirmed',
      'rejected',
      'cancelled',
      'active',
      'completed',
      'modification_requested',
    ])
    .optional(),
  listingId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

module.exports = {
  createBookingSchema,
  patchBookingStatusSchema,
  bookingModificationSchema,
  createUnavailableDateSchema,
  getBookingsQuerySchema,
};
