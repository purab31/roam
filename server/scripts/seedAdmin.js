const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/user.model');
const config = require('../src/config/env');

async function seedAdmin({ autoDisconnect = true } = {}) {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'Admin@Roam2026')) {
    console.error(
      '[Seed Error] In production, ADMIN_PASSWORD must be explicitly provided via environment variable with no default.'
    );
    if (autoDisconnect) process.exit(1);
    throw new Error('ADMIN_PASSWORD must be explicitly provided in production');
  }

  console.log('[Seed] Ensuring platform admin account...');
  if (autoDisconnect) {
    await connectDB();
  }

  try {
    const adminEmail = (process.env.ADMIN_EMAIL || config.adminEmail).toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || config.adminPassword;
    const adminName = process.env.ADMIN_NAME || config.adminName || 'Platform Administrator';
    const adminMobile = process.env.ADMIN_MOBILE || config.adminMobile || '+919876543299';

    let admin = await User.findOne({ email: adminEmail });

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    const allCapabilities = ['admin', 'buyer', 'renter', 'seller', 'dealer'];

    if (admin) {
      console.log(`[Seed] Updating existing admin account: ${adminEmail}`);
      admin.fullName = adminName;
      admin.mobile = adminMobile;
      admin.passwordHash = passwordHash;
      admin.capabilities = allCapabilities;
      admin.accountStatus = 'active';
      await admin.save();
    } else {
      console.log(`[Seed] Creating new platform admin account: ${adminEmail}`);
      admin = await User.create({
        fullName: adminName,
        email: adminEmail,
        mobile: adminMobile,
        passwordHash,
        capabilities: allCapabilities,
        accountStatus: 'active',
      });
    }

    console.log(`[Seed] Admin ready successfully!`);
    console.log(`Email:        ${admin.email}`);
    console.log(`Capabilities: ${admin.capabilities.join(', ')}`);
    console.log(`Status:       ${admin.accountStatus}`);
    return admin;
  } catch (error) {
    console.error(`[Seed Error] Failed to seed admin:`, error);
    if (!autoDisconnect) throw error;
  } finally {
    if (autoDisconnect) {
      await disconnectDB();
    }
  }
}

if (require.main === module) {
  seedAdmin();
}

module.exports = seedAdmin;
