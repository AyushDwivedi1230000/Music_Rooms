/**
 * Multer configuration for audio and profile image uploads
 * Validates MIME type and file size
 */

const path = require('path');
const multer = require('multer');
const { ALLOWED_AUDIO_MIME, UPLOAD } = require('./constants');
const ApiError = require('../utils/ApiError');

// Storage for audio files
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || './uploads/audio');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.mp3';
    cb(null, `audio-${uniqueSuffix}${ext}`);
  },
});

const audioFileFilter = (req, file, cb) => {
  const allowed = ALLOWED_AUDIO_MIME;
  if (!allowed.includes(file.mimetype)) {
    return cb(new ApiError(400, 'Invalid file type. Only MP3, WAV, OGG allowed.'));
  }
  cb(null, true);
};

const uploadAudio = multer({
  storage: audioStorage,
  fileFilter: audioFileFilter,
  limits: { fileSize: UPLOAD.MAX_SIZE },
});

// Storage for profile images (optional)
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/profiles');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `profile-${uniqueSuffix}${ext}`);
  },
});

const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new ApiError(400, 'Invalid image type.'));
  }
  cb(null, true);
};

const uploadProfile = multer({
  storage: profileStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

module.exports = {
  uploadAudio,
  uploadProfile,
};
