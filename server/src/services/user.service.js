const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const { NotFoundError, ConflictError, AuthError } = require('../errors');

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User account not found');
  }
  return user.toSafeObject();
}

async function updateProfile(userId, updateData) {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User account not found');
  }

  if (updateData.mobile && updateData.mobile !== user.mobile) {
    const existing = await User.findOne({
      mobile: updateData.mobile.trim(),
      _id: { $ne: userId },
    });
    if (existing) {
      throw new ConflictError('Mobile number is already in use by another account');
    }
    user.mobile = updateData.mobile.trim();
  }

  if (updateData.fullName) {
    user.fullName = updateData.fullName.trim();
  }

  if (updateData.contactVisibility) {
    user.contactVisibility = {
      ...user.contactVisibility,
      ...updateData.contactVisibility,
    };
  }

  if (updateData.profilePhoto !== undefined) {
    user.profilePhoto = updateData.profilePhoto;
  }

  await user.save();
  return user.toSafeObject();
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw new NotFoundError('User account not found');
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new AuthError('Current password is incorrect');
  }

  const salt = await bcrypt.genSalt(12);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  await user.save();

  return { message: 'Password changed successfully' };
}

async function requestDeactivation(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User account not found');
  }

  // Spec 3.3: Request account deactivation
  user.accountStatus = 'deactivation_requested';
  await user.save();

  return user.toSafeObject();
}

async function addCapability(userId, capability) {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User account not found');
  }

  if (!user.capabilities.includes(capability)) {
    user.capabilities.push(capability);
    await user.save();
  }

  return user.toSafeObject();
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  requestDeactivation,
  addCapability,
};
