const mongoose = require('mongoose');

const dealerDocumentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    fileType: { type: String, required: true },
    size: { type: Number, min: 0 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const dealerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    dealershipName: {
      type: String,
      required: [true, 'Dealership name is required'],
      trim: true,
      minlength: [2, 'Dealership name must be at least 2 characters'],
      maxlength: [120, 'Dealership name cannot exceed 120 characters'],
    },
    ownerName: {
      type: String,
      required: [true, 'Business owner name is required'],
      trim: true,
      minlength: [2, 'Owner name must be at least 2 characters'],
      maxlength: [100, 'Owner name cannot exceed 100 characters'],
    },
    businessEmail: {
      type: String,
      required: [true, 'Business email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid business email address'],
    },
    phone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Dealership address is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true,
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    logo: {
      type: String,
      default: null,
    },
    registrationInfo: {
      registrationNumber: { type: String, trim: true, default: '' },
      taxId: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
    },
    documents: [dealerDocumentSchema],
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'changes_requested', 'suspended', 'revoked'],
      default: 'pending',
      index: true,
    },
    verificationNotes: {
      type: String,
      trim: true,
      default: '',
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Returns safe public profile
dealerSchema.methods.toPublicProfile = function () {
  const obj = this.toObject();
  obj.id = obj._id ? obj._id.toString() : obj.id;
  delete obj.documents;
  delete obj.verificationNotes;
  delete obj.__v;
  return obj;
};

// Returns full object for owner/admin
dealerSchema.methods.toOwnerObject = function () {
  const obj = this.toObject();
  obj.id = obj._id ? obj._id.toString() : obj.id;
  delete obj.__v;
  return obj;
};

dealerSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Dealer', dealerSchema);
