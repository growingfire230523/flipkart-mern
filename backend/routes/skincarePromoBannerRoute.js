const express = require('express');
const {
    getPublicSkinCarePromoBanner,
    getAdminSkinCarePromoBanner,
    upsertAdminSkinCarePromoBanner,
    clearAdminSkinCarePromoBanner,
} = require('../controllers/skincarePromoBannerController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

// Public: homepage skincare promo banner (shown above SkinCare Collection)
router.route('/home/skincare-promo-banner').get(getPublicSkinCarePromoBanner);

// Admin: edit homepage skincare promo banner
router
    .route('/admin/home/skincare-promo-banner')
    .get(isAuthenticatedUser, authorizeRoles('admin'), getAdminSkinCarePromoBanner)
    .put(isAuthenticatedUser, authorizeRoles('admin'), upsertAdminSkinCarePromoBanner)
    .delete(isAuthenticatedUser, authorizeRoles('admin'), clearAdminSkinCarePromoBanner);

module.exports = router;
