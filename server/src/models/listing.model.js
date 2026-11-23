const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema(
  {
    fromStatus: { type: String, required: true },
    toStatus: { type: String, required: true },
    statusType: {
      type: String,
      enum: ['moderation', 'sale', 'rental'],
      required: true,
    },
    changedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    changedAt: { type: Date, default: Date.now },
    reason: { type: String, default: '' },
  },
  { _id: false }
);

const saleSubdocumentSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['active', 'reserved', 'inactive', 'sold'],
      default: 'inactive',
    },
    askingPrice: { type: Number, min: 0, default: 0 }, // integer minor units (paise)
    negotiable: { type: Boolean, default: false },
    minAcceptableOffer: { type: Number, min: 0, default: null }, // PRIVATE - never returned publicly!
    description: { type: String, trim: true, default: '' },
    conditions: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const rentalSubdocumentSchema = new mongoose.Schema(
  {
    dailyPrice: { type: Number, min: 0, default: 0 }, // minor units
    weeklyPrice: { type: Number, min: 0, default: 0 },
    otherPeriods: { type: String, trim: true, default: '' },
    securityDeposit: { type: Number, min: 0, default: 0 },
    minDays: { type: Number, min: 1, default: 1 },
    maxDays: { type: Number, default: 30 },
    availableFrom: { type: Date, default: null },
    availableTo: { type: Date, default: null },
    pickupLocation: { type: String, trim: true, default: '' },
    returnLocation: { type: String, trim: true, default: '' },
    driverIncluded: { type: Boolean, default: false },
    mileageLimit: { type: String, trim: true, default: '' },
    fuelPolicy: { type: String, trim: true, default: '' },
    cancellationPolicy: { type: String, trim: true, default: '' },
    cancellationCutoffHours: { type: Number, min: 0, default: 24 },
    conditions: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'inactive',
    },
  },
  { _id: false }
);

const listingSchema = new mongoose.Schema(
  {
    vehicleRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
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
      },
    },
    purpose: {
      type: String,
      enum: ['sale', 'rent', 'both'],
      required: true,
    },
    moderationStatus: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'rejected', 'removed'],
      default: 'draft',
    },
    sale: {
      type: saleSubdocumentSchema,
      default: () => ({}),
    },
    rental: {
      type: rentalSubdocumentSchema,
      default: () => ({}),
    },
    expiresAt: { type: Date, default: null },
    viewCount: { type: Number, default: 0, min: 0 },
    adminDeactivated: { type: Boolean, default: false },
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

// Indexes for Discovery, Sorting, and Query Performance
// 1. Compound index for public sale listings (status filtering + price range/sort)
listingSchema.index({ moderationStatus: 1, 'sale.status': 1, 'sale.askingPrice': 1 });

// 2. Compound index for public rental listings (status filtering + daily rate range/sort)
listingSchema.index({ moderationStatus: 1, 'rental.status': 1, 'rental.dailyPrice': 1 });

// 3. Indexes for default and updated date sorting on approved listings
listingSchema.index({ moderationStatus: 1, createdAt: -1 });
listingSchema.index({ moderationStatus: 1, updatedAt: -1 });

// 4. Vehicle lookup index (for join and delete guards)
listingSchema.index({ vehicleRef: 1 });

// 5. Owner listing index (for dashboard lookups)
listingSchema.index({ 'ownerRef.id': 1, createdAt: -1 });

/**
 * Strips private listing fields (e.g. sale.minAcceptableOffer) for public view.
 */
listingSchema.methods.toPublicObject = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;

  if (obj.sale) {
    delete obj.sale.minAcceptableOffer;
  }

  // If vehicle is populated, strip its private fields as well
  if (obj.vehicleRef && typeof obj.vehicleRef === 'object' && obj.vehicleRef.registrationNumber) {
    delete obj.vehicleRef.registrationNumber;
    delete obj.vehicleRef.documents;
  }

  return obj;
};

/**
 * Returns full listing object for owner/admin view.
 */
listingSchema.methods.toOwnerObject = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

const Listing = mongoose.model('Listing', listingSchema);

module.exports = Listing;
