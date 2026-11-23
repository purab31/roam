const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: ['requested', 'accepted', 'rejected', 'reschedule_proposed', 'completed', 'cancelled'],
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const inspectionRequestSchema = new mongoose.Schema(
  {
    requester: {
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
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    dealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dealer',
      default: null,
      index: true,
    },
    preferredDateTime: {
      type: Date,
      required: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    proposedAlternative: {
      type: Date,
      default: null,
    },
    alternativeMessage: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    status: {
      type: String,
      enum: ['requested', 'accepted', 'rejected', 'reschedule_proposed', 'completed', 'cancelled'],
      default: 'requested',
      index: true,
    },
    statusHistory: [statusHistorySchema],
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

// Indexes
inspectionRequestSchema.index({ requester: 1, listing: 1 });
inspectionRequestSchema.index({ seller: 1, createdAt: -1 });
inspectionRequestSchema.index({ dealer: 1, createdAt: -1 });

module.exports = mongoose.model('InspectionRequest', inspectionRequestSchema);
