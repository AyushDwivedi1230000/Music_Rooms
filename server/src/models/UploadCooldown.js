/**
 * Upload cooldown tracking - prevent spam uploads
 */

const mongoose = require('mongoose');

const uploadCooldownSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    lastUploadAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

uploadCooldownSchema.index({ userId: 1, roomId: 1 }, { unique: true });

module.exports = mongoose.model('UploadCooldown', uploadCooldownSchema);
