const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user.model');
const config = require('../config/env');
const { ConflictError, AuthError, ValidationError } = require('../errors');

function generateToken(userId) {
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

async function registerUser({
  fullName,
  email,
  mobile,
  password,
  capabilities = ['buyer', 'renter'],
}) {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedMobile = mobile.trim();

  // Spec 3.1 & 18.5: Uniqueness checks for email and mobile
  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    throw new ConflictError('Email address is already registered');
  }

  const existingMobile = await User.findOne({ mobile: normalizedMobile });
  if (existingMobile) {
    throw new ConflictError('Mobile number is already registered');
  }

  // Ensure 'admin' cannot be self-assigned
  const safeCapabilities = capabilities.filter(c => c !== 'admin');
  if (safeCapabilities.length === 0) {
    safeCapabilities.push('buyer', 'renter');
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await User.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    mobile: normalizedMobile,
    passwordHash,
    capabilities: safeCapabilities,
  });

  const token = generateToken(user._id);

  return {
    user: user.toSafeObject(),
    token,
  };
}

async function loginUser({ email, password }) {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!user) {
    throw new AuthError('Invalid email or password');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AuthError('Invalid email or password');
  }

  if (user.accountStatus === 'blocked') {
    throw new AuthError('Your account has been blocked by an administrator');
  }

  const token = generateToken(user._id);

  return {
    user: user.toSafeObject(),
    token,
  };
}

async function forgotPassword({ email }) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (user) {
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${config.clientOrigin}/reset-password?token=${resetToken}`;

    // Spec & Prompt: in development print the reset link to the console
    console.log(`\n========================================`);
    console.log(`[Roam Auth] Password Reset Requested for ${user.email}`);
    console.log(`Reset Token: ${resetToken}`);
    console.log(`Reset Link:  ${resetUrl}`);
    console.log(`Expires in:  15 minutes`);
    console.log(`========================================\n`);
  }

  // Consistent generic response preventing user enumeration
  return {
    message: 'If an account exists with that email, a password reset link has been dispatched.',
  };
}

async function resetPassword({ token, password }) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  }).select('+passwordHash +resetPasswordToken +resetPasswordExpires');

  if (!user) {
    throw new ValidationError('Password reset token is invalid or has expired');
  }

  const salt = await bcrypt.genSalt(12);
  user.passwordHash = await bcrypt.hash(password, salt);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();

  return {
    message: 'Password reset successful. You may now log in with your new password.',
  };
}

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
};
