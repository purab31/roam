const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    fileType: { type: String, required: true },
    size: { type: Number, min: 0 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    isCover: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    caption: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

const vehicleSchema = new mongoose.Schema(
  {
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    variant: { type: String, trim: true, default: '' },
    bodyType: {
      type: String,
      required: true,
      enum: [
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
      ],
    },
    manufacturingYear: { type: Number, required: true },
    registrationYear: { type: Number, required: true },
    registrationNumber: { type: String, required: true, trim: true },
    fuelType: {
      type: String,
      required: true,
      enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG', 'LPG'],
    },
    transmission: {
      type: String,
      required: true,
      enum: ['Manual', 'Automatic'],
    },
    kmDriven: { type: Number, required: true, min: 0 },
    previousOwners: { type: Number, required: true, min: 0, default: 1 },
    condition: {
      type: String,
      required: true,
      enum: ['Excellent', 'Very Good', 'Good', 'Fair', 'Needs Work'],
    },
    colour: { type: String, required: true, trim: true },
    seatingCapacity: { type: Number, required: true, min: 1, default: 5 },
    engineOrBattery: { type: String, trim: true, default: '' },
    location: {
      country: { type: String, default: 'India', trim: true },
      state: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      area: { type: String, trim: true, default: '' },
      pincode: { type: String, required: true, trim: true },
      pickupLocation: { type: String, trim: true, default: '' },
    },
    features: [{ type: String, trim: true }],
    knownDefects: { type: String, trim: true, default: '' },
    serviceHistory: { type: String, trim: true, default: '' },
    accidentHistory: { type: String, trim: true, default: '' },
    insuranceInfo: { type: String, trim: true, default: '' },
    pollutionCertInfo: { type: String, trim: true, default: '' },
    documents: [documentSchema],
    images: [imageSchema],
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

// Indexes for Discovery, Vehicle Filtering, and Location Search
// 1. Brand / Model / Variant compound index for search and brand filters
vehicleSchema.index({ brand: 1, model: 1, variant: 1 });

// 2. Specifications compound index for vehicle spec filters
vehicleSchema.index({ bodyType: 1, fuelType: 1, transmission: 1 });

// 3. Year and mileage compound index for year range and lowest km sorting
vehicleSchema.index({ manufacturingYear: -1, kmDriven: 1 });

// 4. Location hierarchy index for city, area, pincode discovery (Spec 17.1)
vehicleSchema.index({ 'location.city': 1, 'location.area': 1, 'location.pincode': 1 });

// 5. Owner reference index for user vehicle queries
vehicleSchema.index({ 'ownerRef.id': 1 });

// 6. Text index for free-text search fallback over brand, model, variant
vehicleSchema.index({ brand: 'text', model: 'text', variant: 'text' });

/**
 * Strips private vehicle fields (registrationNumber and documents) for public view.
 */
vehicleSchema.methods.toPublicObject = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  delete obj.registrationNumber;
  delete obj.documents;
  return obj;
};

/**
 * Returns full vehicle object for owner/admin view.
 */
vehicleSchema.methods.toOwnerObject = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

module.exports = Vehicle;
