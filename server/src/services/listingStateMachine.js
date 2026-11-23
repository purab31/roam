const { ConflictError } = require('../errors');
const config = require('../config/env');

/**
 * State machine for Roam listings.
 * Enforces valid lifecycle transitions across moderationStatus, sale.status, and rental.status.
 * Invalid transitions throw ConflictError(409) with code 'INVALID_STATUS_TRANSITION'.
 */

const MODERATION_TRANSITIONS = {
  draft: ['pending_review', 'removed'],
  pending_review: ['approved', 'rejected', 'draft', 'removed'],
  approved: ['pending_review', 'rejected', 'removed'],
  rejected: ['draft', 'pending_review', 'removed'],
  removed: [], // terminal
};

const SALE_STATUS_TRANSITIONS = {
  inactive: ['active'],
  active: ['inactive', 'reserved', 'sold'],
  reserved: ['active', 'sold'],
  sold: [], // terminal
};

const RENTAL_STATUS_TRANSITIONS = {
  inactive: ['active'],
  active: ['inactive'],
};

/**
 * Validates and applies a moderation status transition.
 * @param {Object} listing
 * @param {string} toStatus
 * @param {Object} context { user, reason }
 * @returns {Object} Updated listing
 */
function transitionModerationStatus(listing, toStatus, context = {}) {
  const fromStatus = listing.moderationStatus;

  if (fromStatus === toStatus) {
    return listing;
  }

  const allowed = MODERATION_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    throw new ConflictError(
      `Invalid moderation status transition from '${fromStatus}' to '${toStatus}'. Allowed next statuses: [${allowed.join(', ') || 'none'}]`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  listing.moderationStatus = toStatus;

  // If removed, deactivate both sale and rental availability
  if (toStatus === 'removed') {
    if (listing.sale && listing.sale.status !== 'sold') {
      listing.sale.status = 'inactive';
    }
    if (listing.rental) {
      listing.rental.status = 'inactive';
    }
  }

  listing.statusHistory.push({
    fromStatus,
    toStatus,
    statusType: 'moderation',
    changedBy: context.user ? context.user._id : null,
    changedAt: new Date(),
    reason: context.reason || `Moderation status changed from ${fromStatus} to ${toStatus}`,
  });

  return listing;
}

/**
 * Validates and applies a sale status transition.
 * @param {Object} listing
 * @param {string} toStatus ('active' | 'inactive' | 'reserved' | 'sold')
 * @param {Object} context { user, reason }
 * @returns {Object} Updated listing
 */
function transitionSaleStatus(listing, toStatus, context = {}) {
  if (listing.purpose !== 'sale' && listing.purpose !== 'both') {
    throw new ConflictError(
      `Cannot change sale status: listing purpose is '${listing.purpose}'`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  if (listing.moderationStatus !== 'approved' && toStatus === 'active') {
    throw new ConflictError(
      `Cannot activate sale: listing moderationStatus is '${listing.moderationStatus}', must be 'approved'`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  const fromStatus = listing.sale.status || 'inactive';

  if (fromStatus === toStatus) {
    return listing;
  }

  const allowed = SALE_STATUS_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    throw new ConflictError(
      `Invalid sale status transition from '${fromStatus}' to '${toStatus}'. Allowed next statuses: [${allowed.join(', ') || 'none'}]`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  listing.sale.status = toStatus;
  listing.statusHistory.push({
    fromStatus,
    toStatus,
    statusType: 'sale',
    changedBy: context.user ? context.user._id : null,
    changedAt: new Date(),
    reason: context.reason || `Sale status changed from ${fromStatus} to ${toStatus}`,
  });

  return listing;
}

/**
 * Validates and applies a rental status transition.
 * @param {Object} listing
 * @param {string} toStatus ('active' | 'inactive')
 * @param {Object} context { user, reason }
 * @returns {Object} Updated listing
 */
function transitionRentalStatus(listing, toStatus, context = {}) {
  if (listing.purpose !== 'rent' && listing.purpose !== 'both') {
    throw new ConflictError(
      `Cannot change rental status: listing purpose is '${listing.purpose}'`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  if (listing.moderationStatus !== 'approved' && toStatus === 'active') {
    throw new ConflictError(
      `Cannot activate rental: listing moderationStatus is '${listing.moderationStatus}', must be 'approved'`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  const fromStatus = listing.rental?.status || 'inactive';

  if (fromStatus === toStatus) {
    return listing;
  }

  const allowed = RENTAL_STATUS_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    throw new ConflictError(
      `Invalid rental status transition from '${fromStatus}' to '${toStatus}'. Allowed next statuses: [${allowed.join(', ') || 'none'}]`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  if (!listing.rental) {
    listing.rental = {};
  }
  listing.rental.status = toStatus;
  listing.statusHistory.push({
    fromStatus,
    toStatus,
    statusType: 'rental',
    changedBy: context.user ? context.user._id : null,
    changedAt: new Date(),
    reason: context.reason || `Rental status changed from ${fromStatus} to ${toStatus}`,
  });

  return listing;
}

/**
 * Initializes listing status on creation.
 * Newly created listings without saveAsDraft transition to pending_review.
 * Auto-approve is removed per Sprint 8 requirements.
 * @param {Object} listing
 * @param {boolean} [saveAsDraft=false]
 * @param {Object} [context={}]
 */
function initializeListingStatus(listing, saveAsDraft = false, context = {}) {
  listing.statusHistory = listing.statusHistory || [];

  if (saveAsDraft) {
    listing.moderationStatus = 'draft';
    if (listing.sale) listing.sale.status = 'inactive';
    if (listing.rental) listing.rental.status = 'inactive';
    listing.statusHistory.push({
      fromStatus: 'none',
      toStatus: 'draft',
      statusType: 'moderation',
      changedBy: context.user ? context.user._id : null,
      changedAt: new Date(),
      reason: 'Listing created as draft',
    });
    return listing;
  }

  // Initial state before review
  listing.moderationStatus = 'draft';
  if (listing.sale) listing.sale.status = 'inactive';
  if (listing.rental) listing.rental.status = 'inactive';

  // Transition draft -> pending_review
  transitionModerationStatus(listing, 'pending_review', {
    ...context,
    reason: 'Listing submitted for moderation',
  });

  return listing;
}

module.exports = {
  MODERATION_TRANSITIONS,
  SALE_STATUS_TRANSITIONS,
  RENTAL_STATUS_TRANSITIONS,
  transitionModerationStatus,
  transitionSaleStatus,
  transitionRentalStatus,
  initializeListingStatus,
};
