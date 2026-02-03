/**
 * Room session / analytics - for admin dashboard
 */

const mongoose = require('mongoose');

const roomSessionSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    roomCode: String,
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: Date,
    peakUsers: {
      type: Number,
      default: 0,
    },
    totalSongsPlayed: {
      type: Number,
      default: 0,
    },
    durationMinutes: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

roomSessionSchema.index({ roomId: 1 });
roomSessionSchema.index({ startedAt: -1 });

module.exports = mongoose.model('RoomSession', roomSessionSchema);
