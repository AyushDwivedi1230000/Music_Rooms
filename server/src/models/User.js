/**
 * User model - supports guest mode and optional auth
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 30,
    },
    // Optional: for registered users
    email: {
      type: String,
      trim: true,
      sparse: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    profileImage: {
      type: String,
      default: null,
    },
    isGuest: {
      type: Boolean,
      default: true,
    },
    socketId: {
      type: String,
      default: null,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    currentRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ username: 1 });
userSchema.index({ socketId: 1 });
userSchema.index({ currentRoomId: 1 });

module.exports = mongoose.model('User', userSchema);
