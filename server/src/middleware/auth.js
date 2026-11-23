const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/user.model');
const Dealer = require('../models/dealer.model');
const settingsService = require('../services/settings.service');
const { AuthError, ForbiddenError } = require('../errors');

function setAuthCookie(res, token) {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    maxAge: config.cookieMaxAge,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(config.cookieName, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
  });
}

async function requireAuth(req, _res, next) {
  try {
    let token = null;

    if (req.cookies && req.cookies[config.cookieName]) {
      token = req.cookies[config.cookieName];
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AuthError('Authentication required'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AuthError('Authentication session expired. Please log in again.'));
      }
      return next(new AuthError('Invalid authentication token'));
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AuthError('User account not found'));
    }

    if (user.accountStatus === 'blocked') {
      return next(new ForbiddenError('Your account has been blocked by an administrator'));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

async function optionalAuth(req, _res, next) {
  try {
    let token = null;

    if (req.cookies && req.cookies[config.cookieName]) {
      token = req.cookies[config.cookieName];
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch {
      return next();
    }

    const user = await User.findById(decoded.id);
    if (user && user.accountStatus !== 'blocked') {
      req.user = user;
    }
    next();
  } catch {
    next();
  }
}

function requireCapability(...capabilities) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AuthError('Authentication required'));
    }

    // Administrators bypass role checks
    if (req.user.capabilities.includes('admin')) {
      return next();
    }

    const hasRequiredCapability = capabilities.some(cap =>
      req.user.capabilities.includes(cap)
    );

    if (!hasRequiredCapability) {
      return next(
        new ForbiddenError(
          `Action requires [${capabilities.join(', ')}] capability. Current capabilities: [${req.user.capabilities.join(', ')}]`
        )
      );
    }

    next();
  };
}

function requireActiveAccount(req, _res, next) {
  if (!req.user) {
    return next(new AuthError('Authentication required'));
  }

  if (
    req.user.accountStatus === 'deactivated' ||
    req.user.accountStatus === 'blocked'
  ) {
    return next(
      new ForbiddenError(
        `Action blocked: your account status is ${req.user.accountStatus}. Deactivated accounts cannot create new listings, offers, or bookings.`
      )
    );
  }

  next();
}

async function requireVerifiedDealer(req, _res, next) {
  try {
    if (!req.user) {
      return next(new AuthError('Authentication required'));
    }

    // Administrators bypass verification checks
    if (req.user.capabilities.includes('admin')) {
      return next();
    }

    if (!req.user.capabilities.includes('dealer')) {
      return next(new ForbiddenError('Action requires dealer capability', 'FORBIDDEN_NOT_DEALER'));
    }

    const dealer = await Dealer.findOne({ user: req.user._id });
    if (!dealer) {
      return next(
        new ForbiddenError(
          'Dealer profile not found. Please register your dealership first.',
          'DEALER_PROFILE_REQUIRED'
        )
      );
    }

    if (dealer.verificationStatus === 'suspended' || dealer.verificationStatus === 'revoked') {
      return next(
        new ForbiddenError(
          `Your dealership account has been ${dealer.verificationStatus} by an administrator`,
          'DEALER_SUSPENDED'
        )
      );
    }

    const isVerificationRequired = await settingsService.isDealerVerificationRequired();
    if (isVerificationRequired) {
      if (dealer.verificationStatus !== 'approved') {
        return next(
          new ForbiddenError(
            `Publishing requires verified dealer status. Current status: ${dealer.verificationStatus}`,
            'DEALER_VERIFICATION_REQUIRED'
          )
        );
      }
    }

    req.dealer = dealer;
    next();
  } catch (error) {
    next(error);
  }
}

async function requireDealer(req, _res, next) {
  try {
    if (!req.user) {
      return next(new AuthError('Authentication required'));
    }

    if (req.user.capabilities.includes('admin')) {
      return next();
    }

    if (!req.user.capabilities.includes('dealer')) {
      return next(new ForbiddenError('Action requires dealer capability', 'FORBIDDEN_NOT_DEALER'));
    }

    const dealer = await Dealer.findOne({ user: req.user._id });
    if (!dealer) {
      return next(
        new ForbiddenError(
          'Dealer profile not found. Please register your dealership first.',
          'DEALER_PROFILE_REQUIRED'
        )
      );
    }

    if (dealer.verificationStatus === 'suspended' || dealer.verificationStatus === 'revoked') {
      return next(
        new ForbiddenError(
          `Your dealership account has been ${dealer.verificationStatus} by an administrator`,
          'DEALER_SUSPENDED'
        )
      );
    }

    req.dealer = dealer;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
  optionalAuth,
  requireCapability,
  requireActiveAccount,
  requireVerifiedDealer,
  requireDealer,
};
