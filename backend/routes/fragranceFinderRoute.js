const express = require('express');
const { recommendFragrance } = require('../controllers/fragranceFinderController');

const router = express.Router();

// Public endpoint: recommend a single best perfume based on questionnaire answers
router.route('/fragrance-finder/recommend').post(recommendFragrance);

module.exports = router;
