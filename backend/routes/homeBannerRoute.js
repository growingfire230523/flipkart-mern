const express = require('express');
const {
    getPublicHomeHeroBanners,
    getAdminHomeHeroBanners,
    upsertAdminHomeHeroBanners,
    clearAdminHomeHeroBanners,
} = require('../controllers/homeBannerController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

// Public: homepage hero banners (main slider)
router.route('/home/hero-banners').get(getPublicHomeHeroBanners);

// Admin: edit homepage hero banners
router
    .route('/admin/home/hero-banners')
    .get(isAuthenticatedUser, authorizeRoles('admin'), getAdminHomeHeroBanners)
    .put(isAuthenticatedUser, authorizeRoles('admin'), upsertAdminHomeHeroBanners)
    .delete(isAuthenticatedUser, authorizeRoles('admin'), clearAdminHomeHeroBanners);

module.exports = router;
