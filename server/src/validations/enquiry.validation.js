const { z } = require('zod');

const createEnquirySchema = z.object({
  listingId: z.string({ required_error: 'Listing ID is required' }).regex(/^[0-9a-fA-F]{24}$/, 'Invalid listing ID format'),
  subject: z.string({ required_error: 'Subject is required' }).trim().min(3, 'Subject must be at least 3 characters').max(120, 'Subject cannot exceed 120 characters'),
  message: z.string({ required_error: 'Message is required' }).trim().min(5, 'Message must be at least 5 characters').max(3000, 'Message cannot exceed 3000 characters'),
});

const addReplySchema = z.object({
  message: z.string({ required_error: 'Reply message is required' }).trim().min(1, 'Reply message cannot be empty').max(2000, 'Reply cannot exceed 2000 characters'),
});

const patchEnquiryStatusSchema = z.object({
  status: z.enum(['open', 'answered', 'resolved', 'closed'], {
    errorMap: () => ({ message: 'Status must be one of: open, answered, resolved, closed' }),
  }),
});

module.exports = {
  createEnquirySchema,
  addReplySchema,
  patchEnquiryStatusSchema,
};
