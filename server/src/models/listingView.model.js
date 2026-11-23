const mongoose = require('mongoose');

const listingViewSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    viewerKey: {
      type: String,
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 3600, // TTL index: documents automatically expire after 1 hour (3600s)
    },
  },
  {
    timestamps: false,
  }
);

// Compound unique index ensuring only 1 view recorded per listing per viewerKey per hour
listingViewSchema.index({ listing: 1, viewerKey: 1 }, { unique: true });

const ListingView = mongoose.model('ListingView', listingViewSchema);

module.exports = ListingView;
