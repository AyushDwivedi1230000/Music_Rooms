/**
 * Room model - virtual music room with playback state
 */

const mongoose = require('mongoose');
const { ROOM_VISIBILITY, ROLES } = require('../config/constants');

const roomMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.LISTENER,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    roomCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      minlength: 6,
      maxlength: 6,
    },
    passwordHash: {
      type: String,
      default: null,
      select: false,
    },
    isPasswordProtected: {
      type: Boolean,
      default: false,
    },
    visibility: {
      type: String,
      enum: Object.values(ROOM_VISIBILITY),
      default: ROOM_VISIBILITY.PUBLIC,
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [roomMemberSchema],
    // Playback state - synced via Socket.io
    currentSongId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song',
      default: null,
    },
    currentTime: {
      type: Number,
      default: 0,
    },
    isPlaying: {
      type: Boolean,
      default: false,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    isClosed: {
      type: Boolean,
      default: false,
    },
    // Vote skip tracking
    skipVotes: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        votedAt: { type: Date, default: Date.now },
      },
    ],
    // Who can add songs: host | host_cohost | all (admin/host selects this)
    whoCanUpload: {
      type: String,
      enum: ['host', 'host_cohost', 'all'],
      default: 'host_cohost',
    },
  },
  {
    timestamps: true,
  }
);

roomSchema.index({ roomCode: 1 });
roomSchema.index({ visibility: 1, isClosed: 1 });
roomSchema.index({ hostId: 1 });

module.exports = mongoose.model('Room', roomSchema);
