// Cleanup script to remove listings whose vehicleRef does not point to an existing vehicle.
// Usage: node ./server/scripts/cleanupOrphanListings.js
// Ensure NODE_ENV=development (or appropriate) and MongoDB connection string is set in env.

const mongoose = require('mongoose');
const Vehicle = require('../src/models/vehicle.model');
const Listing = require('../src/models/listing.model');
const config = require('../src/config/env'); // provides config.mongoUri

(async () => {
  try {
    // Connect to DB
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const totalVehicles = await Vehicle.countDocuments();
    const totalListings = await Listing.countDocuments();
    console.log(`Vehicles: ${totalVehicles}, Listings: ${totalListings}`);

    // Find listings with non‑existent vehicleRef
    const orphanListings = await Listing.find({})
      .select('_id vehicleRef')
      .lean();

    const vehicleIds = orphanListings.map(l => l.vehicleRef);
    const existingVehicles = await Vehicle.find({ _id: { $in: vehicleIds } })
      .select('_id')
      .lean();
    const existingIdsSet = new Set(existingVehicles.map(v => v._id.toString()));

    const toDelete = orphanListings.filter(l => !existingIdsSet.has(l.vehicleRef.toString()));
    console.log(`Found ${toDelete.length} orphan listings to delete.`);

    if (toDelete.length > 0) {
      const deleteResult = await Listing.deleteMany({ _id: { $in: toDelete.map(l => l._id) } });
      console.log(`Deleted ${deleteResult.deletedCount} listings.`);
    } else {
      console.log('No orphan listings found.');
    }

    const finalVehicleCount = await Vehicle.countDocuments();
    const finalListingCount = await Listing.countDocuments();
    console.log(`After cleanup - Vehicles: ${finalVehicleCount}, Listings: ${finalListingCount}`);
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
})();
