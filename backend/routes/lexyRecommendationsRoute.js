const express = require('express');
const { getLexyRecommendations } = require('../controllers/lexyRecommendationsController');

const router = express.Router();

// POST /api/v1/lexy/recommendations
router.route('/lexy/recommendations').post(getLexyRecommendations);

module.exports = router;
