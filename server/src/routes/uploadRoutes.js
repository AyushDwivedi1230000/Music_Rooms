/**
 * Upload routes - audio file upload
 */

const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { uploadAudio: multerAudio } = require('../config/multer');
const { uploadLimiter } = require('../middleware/rateLimiter');

router.post(
  '/rooms/:roomId/upload',
  uploadLimiter,
  multerAudio.single('audio'),
  uploadController.uploadAudio
);

module.exports = router;
