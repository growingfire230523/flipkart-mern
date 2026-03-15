const express = require('express');
const {
    getPublicCommunityBanner,
    getAdminCommunityBanner,
    upsertAdminCommunityBanner,
    clearAdminCommunityBanner,
} = require('../controllers/communityBannerController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

router.route('/lexi-community/banner').get(getPublicCommunityBanner);

// Alias: Homepage highlight banner
router.route('/home/banner').get(getPublicCommunityBanner);

router
    .route('/admin/lexi-community/banner')
    .get(isAuthenticatedUser, authorizeRoles('admin'), getAdminCommunityBanner)
    .put(isAuthenticatedUser, authorizeRoles('admin'), upsertAdminCommunityBanner)
    .delete(isAuthenticatedUser, authorizeRoles('admin'), clearAdminCommunityBanner);

// Alias: Homepage highlight banner
router
    .route('/admin/home/banner')
    .get(isAuthenticatedUser, authorizeRoles('admin'), getAdminCommunityBanner)
    .put(isAuthenticatedUser, authorizeRoles('admin'), upsertAdminCommunityBanner)
    .delete(isAuthenticatedUser, authorizeRoles('admin'), clearAdminCommunityBanner);

module.exports = router;
