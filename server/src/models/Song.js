/**
 * Song model - metadata for uploaded audio files
 */

const mongoose = require('mongoose');

const songSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    artist: {
      type: String,
      trim: true,
      default: 'Unknown Artist',
      maxlength: 200,
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    dislikes: {
      type: Number,
      default: 0,
    },
    userVotes: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        vote: { type: Number, enum: [1, -1] }, // 1 = like, -1 = dislike
      },
    ],
  },
  {
    timestamps: true,
  }
);

songSchema.index({ roomId: 1, order: 1 });
songSchema.index({ uploadedBy: 1, roomId: 1 });

module.exports = mongoose.model('Song', songSchema);
