const express = require('express');
const { getTestimonials, createTestimonial } = require('../controllers/testimonialController');

const router = express.Router();

router.route('/testimonials').get(getTestimonials).post(createTestimonial);

module.exports = router;
