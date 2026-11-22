const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/user.model');
const config = require('../src/config/env');

async function seedAdmin() {
  console.log('[Seed] Connecting to database...');
  await connectDB();

  try {
    const adminEmail = config.adminEmail.toLowerCase().trim();
    let admin = await User.findOne({ email: adminEmail });

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(config.adminPassword, salt);

    const allCapabilities = ['admin', 'buyer', 'renter', 'seller', 'dealer'];

    if (admin) {
      console.log(`[Seed] Updating existing admin account: ${adminEmail}`);
      admin.fullName = config.adminName;
      admin.mobile = config.adminMobile;
      admin.passwordHash = passwordHash;
      admin.capabilities = allCapabilities;
      admin.accountStatus = 'active';
      await admin.save();
    } else {
      console.log(`[Seed] Creating new platform admin account: ${adminEmail}`);
      admin = await User.create({
        fullName: config.adminName,
        email: adminEmail,
        mobile: config.adminMobile,
        passwordHash,
        capabilities: allCapabilities,
        accountStatus: 'active',
      });
    }

    console.log(`[Seed] Admin seeded successfully!`);
    console.log(`Email:        ${admin.email}`);
    console.log(`Capabilities: ${admin.capabilities.join(', ')}`);
    console.log(`Status:       ${admin.accountStatus}`);
  } catch (error) {
    console.error(`[Seed Error] Failed to seed admin:`, error);
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  seedAdmin();
}

module.exports = seedAdmin;
