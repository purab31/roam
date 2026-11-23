const mongoose = require('mongoose');

const DEFAULT_CATEGORIES = [
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
];

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global',
    },
    dealerVerificationRequired: {
      type: Boolean,
      default: true,
    },
    listingExpiryDays: {
      type: Number,
      default: 90,
      min: 1,
      max: 365,
    },
    categories: {
      type: [String],
      default: DEFAULT_CATEGORIES,
    },
    announcementBar: {
      message1: {
        type: String,
        default: '',
        trim: true,
        maxlength: 200,
      },
      message2: {
        type: String,
        default: '',
        trim: true,
        maxlength: 200,
      },
      linkText: {
        type: String,
        default: '',
        trim: true,
        maxlength: 50,
      },
      linkUrl: {
        type: String,
        default: '',
        trim: true,
        maxlength: 500,
      },
    },
  },
  {
    timestamps: true,
  }
);

settingsSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
