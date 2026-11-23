const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subjectType: {
      type: String,
      enum: ['listing', 'user', 'dealer'],
      required: true,
      index: true,
    },
    subjectRef: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        'misleading',
        'fraud',
        'inappropriate_media',
        'suspicious_account',
        'misleading_dealer',
        'other',
      ],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ['open', 'in_review', 'resolved', 'dismissed'],
      default: 'open',
      index: true,
    },
    resolutionNote: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Optimize query for checking open reports on same subject by same reporter
reportSchema.index({ reporter: 1, subjectType: 1, subjectRef: 1, status: 1 });
reportSchema.index({ status: 1, createdAt: -1 });

reportSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
