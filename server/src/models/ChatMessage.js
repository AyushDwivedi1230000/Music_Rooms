/**
 * Chat message model - room chat with system messages
 */

const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for system messages
    },
    username: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

chatMessageSchema.index({ roomId: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
