const dealerService = require('../services/dealer.service');
const bulkUploadService = require('../services/bulkUpload.service');
const fs = require('fs');

async function registerDealer(req, res, next) {
  try {
    const dealer = await dealerService.registerDealer(req.user, req.body);
    res.status(201).json({
      success: true,
      data: dealer,
    });
  } catch (error) {
    next(error);
  }
}

async function getPublicDealers(req, res, next) {
  try {
    const result = await dealerService.getPublicDealers(req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getDealerById(req, res, next) {
  try {
    const dealer = await dealerService.getDealerById(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: dealer,
    });
  } catch (error) {
    next(error);
  }
}

async function getMyDealerProfile(req, res, next) {
  try {
    const dealer = await dealerService.getMyDealerProfile(req.user);
    res.status(200).json({
      success: true,
      data: dealer,
    });
  } catch (error) {
    next(error);
  }
}

async function updateDealerProfile(req, res, next) {
  try {
    const dealer = await dealerService.updateDealerProfile(req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      data: dealer,
    });
  } catch (error) {
    next(error);
  }
}

async function uploadDealerLogo(req, res, next) {
  try {
    const dealer = await dealerService.uploadLogo(req.params.id, req.file, req.user);
    res.status(200).json({
      success: true,
      data: dealer,
    });
  } catch (error) {
    next(error);
  }
}

async function uploadDealerDocument(req, res, next) {
  try {
    const dealer = await dealerService.addDealerDocument(req.params.id, req.file, req.user);
    res.status(201).json({
      success: true,
      data: dealer,
    });
  } catch (error) {
    next(error);
  }
}

async function downloadDealerDocument(req, res, next) {
  try {
    const docInfo = await dealerService.getDealerDocumentPath(
      req.params.id,
      req.params.docId,
      req.user
    );
    res.setHeader('Content-Type', docInfo.fileType);
    res.download(docInfo.filePath, docInfo.name);
  } catch (error) {
    next(error);
  }
}

async function getDiscoverOwnerListings(req, res, next) {
  try {
    const result = await dealerService.getDiscoverOwnerListings(req.user, req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getDealerInventory(req, res, next) {
  try {
    const items = await dealerService.getDealerInventory(req.user, req.query);
    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
}

async function bulkUpdateListingStatus(req, res, next) {
  try {
    const result = await dealerService.bulkUpdateListingStatus(req.user, req.body);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getDealerDashboardStats(req, res, next) {
  try {
    const stats = await dealerService.getDealerDashboardStats(req.user);
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

async function getPublicDealerListings(req, res, next) {
  try {
    const listings = await dealerService.getPublicDealerListings(req.params.id, req.query);
    res.status(200).json({
      success: true,
      data: listings,
    });
  } catch (error) {
    next(error);
  }
}

async function bulkUploadInventory(req, res, next) {
  try {
    let csvText = '';

    if (req.file) {
      csvText = fs.readFileSync(req.file.path, 'utf8');
    } else if (req.body.csvText) {
      csvText = req.body.csvText;
    } else {
      return res.status(400).json({
        success: false,
        error: { code: 'CSV_REQUIRED', message: 'CSV file or csvText body is required' },
      });
    }

    const mode = req.query.mode || req.body.mode || 'atomic';
    const result = await bulkUploadService.processBulkUpload(req.user, csvText, { mode });

    const statusCode = result.success ? 200 : 422;
    res.status(statusCode).json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  registerDealer,
  getPublicDealers,
  getDealerById,
  getMyDealerProfile,
  updateDealerProfile,
  uploadDealerLogo,
  uploadDealerDocument,
  getDiscoverOwnerListings,
  getDealerInventory,
  bulkUpdateListingStatus,
  getDealerDashboardStats,
  getPublicDealerListings,
  bulkUploadInventory,
  downloadDealerDocument,
};
