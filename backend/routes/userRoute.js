const express = require('express');
const {
    registerUser,
    loginUser,
    logoutUser,
    getUserDetails,
    forgotPassword,
    resetPassword,
    updatePassword,
    updateProfile,
    getAdminDashboardStats,
    getAllUsers,
    getSingleUser,
    updateUserRole,
    deleteUser,
    loginWithGoogle,
    requestPhoneLoginOtp,
    verifyPhoneLoginOtp,
    requestLinkPhoneOtp,
    verifyLinkPhoneOtp,
    updateDeliveryLocation,
    requestPhoneRegisterOtp,
    verifyPhoneRegisterOtp,
} = require('../controllers/userController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.route('/oauth/google').post(loginWithGoogle);
router.route('/phone/login/otp').post(requestPhoneLoginOtp);
router.route('/phone/login/verify').post(verifyPhoneLoginOtp);
router.route('/phone/register/otp').post(requestPhoneRegisterOtp);
router.route('/phone/register/verify').post(verifyPhoneRegisterOtp);
router.route('/logout').get(logoutUser);

router.route('/me').get(isAuthenticatedUser, getUserDetails);
router.route('/me/delivery-location').put(isAuthenticatedUser, updateDeliveryLocation);

router.route('/password/forgot').post(forgotPassword);
router.route('/password/reset/:token').put(resetPassword);

router.route('/password/update').put(isAuthenticatedUser, updatePassword);

router.route('/me/update').put(isAuthenticatedUser, updateProfile);

router.route('/phone/link/otp').post(isAuthenticatedUser, requestLinkPhoneOtp);
router.route('/phone/link/verify').post(isAuthenticatedUser, verifyLinkPhoneOtp);

router.route('/admin/dashboard/stats').get(isAuthenticatedUser, authorizeRoles("admin"), getAdminDashboardStats);
router.route("/admin/users").get(isAuthenticatedUser, authorizeRoles("admin"), getAllUsers);

router.route("/admin/user/:id")
    .get(isAuthenticatedUser, authorizeRoles("admin"), getSingleUser)
    .put(isAuthenticatedUser, authorizeRoles("admin"), updateUserRole)
    .delete(isAuthenticatedUser, authorizeRoles("admin"), deleteUser);

module.exports = router;