/**
 * Upload service - validate cooldown, count, extract metadata
 */

const Song = require('../models/Song');
const UploadCooldown = require('../models/UploadCooldown');
const { UPLOAD } = require('../config/constants');
const ApiError = require('../utils/ApiError');

/**
 * Check if user can upload (cooldown and per-user limit)
 */
const canUpload = async (userId, roomId) => {
  const cooldown = await UploadCooldown.findOne({ userId, roomId });
  if (cooldown) {
    const elapsed = Date.now() - new Date(cooldown.lastUploadAt).getTime();
    if (elapsed < UPLOAD.COOLDOWN_MS) {
      const waitSeconds = Math.ceil((UPLOAD.COOLDOWN_MS - elapsed) / 1000);
      throw new ApiError(429, `Please wait ${waitSeconds} seconds before uploading again.`);
    }
  }

  const count = await Song.countDocuments({ roomId, uploadedBy: userId });
  if (count >= UPLOAD.MAX_PER_USER_PER_ROOM) {
    throw new ApiError(400, `You can upload at most ${UPLOAD.MAX_PER_USER_PER_ROOM} songs per room.`);
  }

  return true;
};

/**
 * Record upload for cooldown
 */
const recordUpload = async (userId, roomId) => {
  await UploadCooldown.findOneAndUpdate(
    { userId, roomId },
    { lastUploadAt: new Date() },
    { upsert: true }
  );
};

/**
 * Get next order index for queue
 */
const getNextOrder = async (roomId) => {
  const last = await Song.findOne({ roomId }).sort({ order: -1 }).select('order').lean();
  return (last?.order ?? -1) + 1;
};

module.exports = {
  canUpload,
  recordUpload,
  getNextOrder,
};
