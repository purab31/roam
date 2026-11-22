const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/user.model');
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

module.exports = {
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
  requireCapability,
  requireActiveAccount,
};
