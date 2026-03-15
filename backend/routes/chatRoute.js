const express = require('express');
const { chatWithLexy } = require('../controllers/chatController');
const optionalAuth = require('../middlewares/optionalAuth');

const router = express.Router();

// Public endpoint (no auth required): chat assistant can still recommend products.
router.route('/chat').post(optionalAuth, chatWithLexy);

module.exports = router;
