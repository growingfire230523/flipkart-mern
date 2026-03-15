const express = require('express');
const { analyzeFace } = require('../controllers/lexyAnalyzerController');

const router = express.Router();

// POST /api/v1/lexy/analyze-face (multipart form-data field: image)
router.route('/lexy/analyze-face').post(analyzeFace);

module.exports = router;
