const express = require('express');
const { getAllProducts, getProductSuggestions, getProductDetails, updateProduct, deleteProduct, getProductReviews, deleteReview, createProductReview, createProduct, getAdminProducts, getProducts, getTopRatedProducts, getNewInProducts, getBestSellerProducts, getMakeMyKitProducts, getDealProducts, toggleDealOfDay, getDealConfig, updateDealConfig } = require('../controllers/productController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

router.route('/products').get(getAllProducts);
router.route('/products/suggest').get(getProductSuggestions);
router.route('/products/all').get(getProducts);
router.route('/products/top-rated').get(getTopRatedProducts);
router.route('/products/new-in').get(getNewInProducts);
router.route('/products/best-sellers').get(getBestSellerProducts);
router.route('/products/make-kit').get(getMakeMyKitProducts);
router.route('/deals').get(getDealProducts);
router.route('/deals/config').get(getDealConfig);

router.route('/admin/products').get(isAuthenticatedUser, authorizeRoles("admin"), getAdminProducts);
router.route('/admin/product/new').post(isAuthenticatedUser, authorizeRoles("admin"), createProduct);

router.route('/admin/product/:id')
    .put(isAuthenticatedUser, authorizeRoles("admin"), updateProduct)
    .delete(isAuthenticatedUser, authorizeRoles("admin"), deleteProduct);

router.route('/admin/product/:id/deal')
    .put(isAuthenticatedUser, authorizeRoles("admin"), toggleDealOfDay);

router.route('/admin/deals/config')
    .put(isAuthenticatedUser, authorizeRoles("admin"), updateDealConfig);

router.route('/product/:id').get(getProductDetails);

router.route('/review').put(isAuthenticatedUser, createProductReview);

router.route('/admin/reviews')
    .get(getProductReviews)
    .delete(isAuthenticatedUser, deleteReview);

module.exports = router;