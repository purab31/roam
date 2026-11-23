const mongoose = require('mongoose');

const bookingStatusHistorySchema = new mongoose.Schema(
  {
    fromStatus: { type: String, required: true },
    toStatus: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: Date.now },
    reason: { type: String, default: '' },
  },
  { _id: false }
);

const pricingSnapshotSchema = new mongoose.Schema(
  {
    baseRate: { type: Number, required: true, min: 0 }, // minor units (paise)
    days: { type: Number, required: true, min: 1 },
    additionalCharges: { type: Number, default: 0, min: 0 },
    deposit: { type: Number, default: 0, min: 0 },
    estimatedTotal: { type: Number, required: true, min: 0 }, // baseRate + additionalCharges + deposit
  },
  { _id: false }
);

const pendingModificationSchema = new mongoose.Schema(
  {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    pricing: { type: pricingSnapshotSchema, required: true },
    reason: { type: String, default: '' },
    requestedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const modificationHistorySchema = new mongoose.Schema(
  {
    previousStartDate: { type: Date, required: true },
    previousEndDate: { type: Date, required: true },
    previousPricing: { type: pricingSnapshotSchema, required: true },
    proposedStartDate: { type: Date, required: true },
    proposedEndDate: { type: Date, required: true },
    proposedPricing: { type: pricingSnapshotSchema, required: true },
    action: { type: String, enum: ['approved', 'rejected'], required: true },
    actionAt: { type: Date, default: Date.now },
    actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reason: { type: String, default: '' },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    renter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    ownerRef: {
      type: {
        type: String,
        enum: ['user', 'dealer'],
        required: true,
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'ownerRef.type',
        index: true,
      },
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    pricing: {
      type: pricingSnapshotSchema,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    status: {
      type: String,
      enum: [
        'requested',
        'pending',
        'confirmed',
        'rejected',
        'cancelled',
        'active',
        'completed',
        'modification_requested',
      ],
      default: 'requested',
      index: true,
    },
    pendingModification: {
      type: pendingModificationSchema,
      default: null,
    },
    modificationHistory: [modificationHistorySchema],
    statusHistory: [bookingStatusHistorySchema],
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for conflict checks and date queries
bookingSchema.index({ listing: 1, status: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ 'ownerRef.id': 1, status: 1, createdAt: -1 });
bookingSchema.index({ renter: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
