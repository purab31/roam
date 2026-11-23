const { ForbiddenError, NotFoundError } = require('../errors');

/**
 * Middleware factory to enforce ownership of resources that have an `ownerRef: { type, id }`.
 * Works seamlessly for both individual users and dealers (Sprint 5 ready).
 * Platform administrators bypass ownership checks.
 *
 * @param {Function|Model} getModel - Mongoose model or getter function returning the model
 * @param {string} [paramName='id'] - Request parameter name containing the resource ID
 * @param {string} [attachProperty='resource'] - Name under which the found resource is attached to `req`
 */
function requireOwnership(getModel, paramName = 'id', attachProperty = 'resource') {
  return async (req, _res, next) => {
    try {
      if (!req.user) {
        return next(new ForbiddenError('Authentication required'));
      }

      const Model = typeof getModel === 'function' && !getModel.findById ? getModel() : getModel;
      const resourceId = req.params[paramName];

      const resource = await Model.findById(resourceId);
      if (!resource) {
        return next(new NotFoundError(`${Model.modelName || 'Resource'} not found`));
      }

      // Administrators bypass ownership restrictions
      if (req.user.capabilities && req.user.capabilities.includes('admin')) {
        req[attachProperty] = resource;
        return next();
      }

      const ownerRef = resource.ownerRef;
      if (!ownerRef || !ownerRef.id) {
        return next(new ForbiddenError('Resource does not have an associated owner'));
      }

      const resourceOwnerId = ownerRef.id.toString();
      const currentUserId = req.user._id.toString();

      let isOwner = false;

      if (ownerRef.type === 'user') {
        isOwner = resourceOwnerId === currentUserId;
      } else if (ownerRef.type === 'dealer') {
        // In Sprint 5, users may have req.user.dealerId or be the dealer owner
        const userDealerId = req.user.dealerId ? req.user.dealerId.toString() : null;
        isOwner = resourceOwnerId === currentUserId || (userDealerId && resourceOwnerId === userDealerId);
      }

      if (!isOwner) {
        return next(
          new ForbiddenError('Forbidden: you do not have permission to access or modify this resource')
        );
      }

      req[attachProperty] = resource;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  requireOwnership,
};
