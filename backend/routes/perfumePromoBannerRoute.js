const express = require('express');
const {
    getPublicPerfumePromoBanner,
    getAdminPerfumePromoBanner,
    upsertAdminPerfumePromoBanner,
    clearAdminPerfumePromoBanner,
} = require('../controllers/perfumePromoBannerController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

// Public: homepage perfume promo banner (shown above Perfume Collection)
router.route('/home/perfume-promo-banner').get(getPublicPerfumePromoBanner);

// Admin: edit homepage perfume promo banner
router
    .route('/admin/home/perfume-promo-banner')
    .get(isAuthenticatedUser, authorizeRoles('admin'), getAdminPerfumePromoBanner)
    .put(isAuthenticatedUser, authorizeRoles('admin'), upsertAdminPerfumePromoBanner)
    .delete(isAuthenticatedUser, authorizeRoles('admin'), clearAdminPerfumePromoBanner);

module.exports = router;
