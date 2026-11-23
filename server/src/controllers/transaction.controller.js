const transactionService = require('../services/transaction.service');

async function createSaleTransaction(req, res, next) {
  try {
    const transaction = await transactionService.createSaleTransaction(req.user, req.body);
    res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
}

async function getMyTransactions(req, res, next) {
  try {
    const result = await transactionService.getMyTransactions(req.user, req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function createAcquisition(req, res, next) {
  try {
    const transaction = await transactionService.createAcquisition(req.user, req.body);
    res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
}

async function updateAcquisitionStatus(req, res, next) {
  try {
    const transaction = await transactionService.updateAcquisitionStatus(
      req.user,
      req.params.id,
      req.body
    );
    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createSaleTransaction,
  createAcquisition,
  updateAcquisitionStatus,
  getMyTransactions,
};
