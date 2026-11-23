const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { requireAuth, requireActiveAccount } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createTransactionSchema,
  createAcquisitionSchema,
  updateAcquisitionStatusSchema,
} = require('../validations/transaction.validation');

router.use(requireAuth);

router.post('/', requireActiveAccount, validate(createTransactionSchema), transactionController.createSaleTransaction);
router.post('/acquire', requireActiveAccount, validate(createAcquisitionSchema), transactionController.createAcquisition);
router.patch('/:id/acquisition', requireActiveAccount, validate(updateAcquisitionStatusSchema), transactionController.updateAcquisitionStatus);
router.get('/my', transactionController.getMyTransactions);

module.exports = router;
