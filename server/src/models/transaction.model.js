const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    finalAmount: {
      type: Number, // integer minor units (paise)
      required: true,
      min: 0,
    },
    buyer: {
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
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    offerRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      required: false,
    },
    bookingRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: false,
    },
    deposit: {
      type: Number,
      default: 0,
      min: 0,
    },
    rentalPeriod: {
      startDate: { type: Date },
      endDate: { type: Date },
    },
    transactionType: {
      type: String,
      enum: ['sale', 'rental'],
      default: 'sale',
    },
    acquisitionStatus: {
      type: String,
      enum: ['none', 'acquisition_pending', 'acquired', 'cancelled'],
      default: 'none',
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    return ret;
  },
});

transactionSchema.set('toObject', {
  transform: (_doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    return ret;
  },
});

transactionSchema.index({ seller: 1, createdAt: -1 });
transactionSchema.index({ buyer: 1, createdAt: -1 });
transactionSchema.index(
  { offerRef: 1 },
  { unique: true, partialFilterExpression: { offerRef: { $exists: true } } }
);
transactionSchema.index(
  { bookingRef: 1 },
  { unique: true, partialFilterExpression: { bookingRef: { $exists: true } } }
);

// Validate by transactionType: sale/acquisition require offerRef, rental requires bookingRef
transactionSchema.pre('validate', function (next) {
  if (this.transactionType === 'sale' && !this.offerRef) {
    this.invalidate('offerRef', 'offerRef is required for sale transactions');
  }
  if (this.transactionType === 'rental' && !this.bookingRef) {
    this.invalidate('bookingRef', 'bookingRef is required for rental transactions');
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
