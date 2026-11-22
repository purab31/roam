const userService = require('../services/user.service');

async function getProfile(req, res, next) {
  try {
    const user = await userService.getProfile(req.user._id);
    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const user = await userService.updateProfile(req.user._id, req.body);
    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const result = await userService.changePassword(req.user._id, req.body);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function requestDeactivation(req, res, next) {
  try {
    const user = await userService.requestDeactivation(req.user._id);
    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

async function addCapability(req, res, next) {
  try {
    const user = await userService.addCapability(req.user._id, req.body.capability);
    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  requestDeactivation,
  addCapability,
};
