const express = require('express');
const {
    getPublicNewInAds,
    getAdminNewInAds,
    upsertAdminNewInAds,
    clearAdminNewInAds,
} = require('../controllers/newInAdsController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

// Public: homepage "New In" side ads
router.route('/home/new-in-ads').get(getPublicNewInAds);

// Admin: edit homepage "New In" side ads
router
    .route('/admin/home/new-in-ads')
    .get(isAuthenticatedUser, authorizeRoles('admin'), getAdminNewInAds)
    .put(isAuthenticatedUser, authorizeRoles('admin'), upsertAdminNewInAds)
    .delete(isAuthenticatedUser, authorizeRoles('admin'), clearAdminNewInAds);

module.exports = router;
