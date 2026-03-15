const express = require('express');
const {
    getPublicMakeupPromoBanner,
    getAdminMakeupPromoBanner,
    upsertAdminMakeupPromoBanner,
    clearAdminMakeupPromoBanner,
} = require('../controllers/makeupPromoBannerController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

// Public: homepage makeup promo banner (shown above Makeup Collection)
router.route('/home/makeup-promo-banner').get(getPublicMakeupPromoBanner);

// Admin: edit homepage makeup promo banner
router
    .route('/admin/home/makeup-promo-banner')
    .get(isAuthenticatedUser, authorizeRoles('admin'), getAdminMakeupPromoBanner)
    .put(isAuthenticatedUser, authorizeRoles('admin'), upsertAdminMakeupPromoBanner)
    .delete(isAuthenticatedUser, authorizeRoles('admin'), clearAdminMakeupPromoBanner);

module.exports = router;
