const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offer.controller');
const { requireAuth, requireActiveAccount } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createOfferSchema,
  counterOfferSchema,
  patchOfferStatusSchema,
} = require('../validations/offer.validation');

router.use(requireAuth);

// CRITICAL: Specific sub-paths BEFORE parameterized /:id route
router.get('/my-offers', offerController.getMyOffers);
router.get('/received', offerController.getReceivedOffers);

router.post('/', requireActiveAccount, validate(createOfferSchema), offerController.createOffer);
router.get('/:id', offerController.getOfferById);
router.post('/:id/counter', requireActiveAccount, validate(counterOfferSchema), offerController.counterOffer);
router.patch('/:id/status', requireActiveAccount, validate(patchOfferStatusSchema), offerController.updateOfferStatus);

module.exports = router;
