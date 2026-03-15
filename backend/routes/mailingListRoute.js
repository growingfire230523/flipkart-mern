const express = require('express');
const {
    subscribeToMailingList,
    getAdminMailingList,
    deleteMailingListEntry,
    createMailCampaign,
    unsubscribeFromMailingList,
} = require('../controllers/mailingListController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

router.route('/mailing-list/subscribe').post(subscribeToMailingList);
router.route('/mailing-list/unsubscribe').get(unsubscribeFromMailingList);

router
    .route('/admin/mailing-list')
    .get(isAuthenticatedUser, authorizeRoles('admin'), getAdminMailingList);

router
    .route('/admin/mailing-list/campaigns')
    .post(isAuthenticatedUser, authorizeRoles('admin'), createMailCampaign);

router
    .route('/admin/mailing-list/:id')
    .delete(isAuthenticatedUser, authorizeRoles('admin'), deleteMailingListEntry);

module.exports = router;
