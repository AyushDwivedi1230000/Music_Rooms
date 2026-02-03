/**
 * Admin dashboard API routes
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/admin/stats', adminController.getStats);

module.exports = router;
