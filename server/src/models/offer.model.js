const mongoose = require('mongoose');

const offerHistorySchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: [
        'submitted',
        'counteroffer_made',
        'accepted',
        'rejected',
        'withdrawn',
        'expired',
        'completed',
        'closed_competing_offer',
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    message: {
      type: String,
      trim: true,
      default: '',
      maxlength: 2000,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const offerSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    offeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number, // integer minor units (paise)
      required: true,
      min: 0,
    },
    message: {
      type: String,
      trim: true,
      default: '',
      maxlength: 3000,
    },
    status: {
      type: String,
      enum: [
        'submitted',
        'pending',
        'accepted',
        'rejected',
        'counteroffer_made',
        'withdrawn',
        'expired',
        'completed',
      ],
      default: 'submitted',
      index: true,
    },
    awaitingResponseFrom: {
      type: String,
      enum: ['seller', 'buyer', 'none'],
      default: 'seller',
    },
    isBelowMinimum: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry
    },
    history: [offerHistorySchema],
  },
  {
    timestamps: true,
  }
);

offerSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    return ret;
  },
});

offerSchema.set('toObject', {
  transform: (_doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    return ret;
  },
});

offerSchema.index({ listing: 1, status: 1 });
offerSchema.index({ offeredBy: 1, createdAt: -1 });
offerSchema.index({ seller: 1, createdAt: -1 });

module.exports = mongoose.model('Offer', offerSchema);
