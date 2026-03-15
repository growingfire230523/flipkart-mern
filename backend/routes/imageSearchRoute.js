const express = require('express');
const { imageSearch } = require('../controllers/imageSearchController');

const router = express.Router();

// POST /api/v1/image-search (multipart form-data field: image)
router.route('/image-search').post(imageSearch);

module.exports = router;
