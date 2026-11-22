const authService = require('../services/auth.service');
const { setAuthCookie, clearAuthCookie } = require('../middleware/auth');

async function register(req, res, next) {
  try {
    const { user, token } = await authService.registerUser(req.body);
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { user, token } = await authService.loginUser(req.body);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
}

async function logout(_req, res, next) {
  try {
    clearAuthCookie(res);
    return res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (error) {
    next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const result = await authService.forgotPassword(req.body);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const result = await authService.resetPassword(req.body);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
};
