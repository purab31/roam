// Script to remove duplicate listings, keeping only the most recent (by createdAt) for each vehicle.
// Usage: node server/scripts/removeDuplicateListings.js

const mongoose = require('mongoose');
const Listing = require('../src/models/listing.model');
const config = require('../src/config/env'); // provides config.mongoUri

(async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Fetch all listings, sorted newest first
    const listings = await Listing.find({})
      .select('_id vehicleRef createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const seen = new Set();
    const duplicates = [];
    for (const l of listings) {
      const vid = l.vehicleRef?.toString();
      if (!vid) continue;
      if (seen.has(vid)) {
        duplicates.push(l._id);
      } else {
        seen.add(vid);
      }
    }
    console.log(`Found ${duplicates.length} duplicate listings to delete.`);
    if (duplicates.length > 0) {
      const result = await Listing.deleteMany({ _id: { $in: duplicates } });
      console.log(`Deleted ${result.deletedCount} duplicates.`);
    } else {
      console.log('No duplicate listings found.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
})();
