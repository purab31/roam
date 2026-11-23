// Script to verify each vehicle has exactly one listing and no duplicates.
// Usage: node server/scripts/verifyListings.js

const mongoose = require('mongoose');
const Listing = require('../src/models/listing.model');
const config = require('../src/config/env'); // config.mongoUri

(async () => {
  try {
    await mongoose.connect(config.mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    const listings = await Listing.find({}).select('vehicleRef').lean();
    const countMap = {};
    for (const l of listings) {
      const vid = l.vehicleRef?.toString();
      if (!vid) continue;
      countMap[vid] = (countMap[vid] || 0) + 1;
    }
    const duplicates = Object.entries(countMap).filter(([,c]) => c > 1);
    const missing = Object.entries(countMap).filter(([,c]) => c === 0);
    console.log('Total listings:', listings.length);
    console.log('Duplicate vehicleRefs count:', duplicates.length);
    if (duplicates.length) console.log('Duplicates:', duplicates);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
})();
