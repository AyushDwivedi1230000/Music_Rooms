/**
 * API routes index - mount all route modules
 */

const express = require('express');
const roomRoutes = require('./roomRoutes');
const uploadRoutes = require('./uploadRoutes');
const adminRoutes = require('./adminRoutes');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(apiLimiter);
router.use(roomRoutes);
router.use(uploadRoutes);
router.use(adminRoutes);

module.exports = router;
