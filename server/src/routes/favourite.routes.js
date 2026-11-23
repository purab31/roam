const express = require('express');
const router = express.Router();
const favouriteController = require('../controllers/favourite.controller');
const { requireAuth, requireActiveAccount } = require('../middleware/auth');

router.use(requireAuth);
router.use(requireActiveAccount);

router.get('/', favouriteController.getFavourites);
router.post('/', favouriteController.addFavourite);
router.delete('/:id', favouriteController.removeFavourite); // takes listing ID only

module.exports = router;
