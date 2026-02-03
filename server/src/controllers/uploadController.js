/**
 * Upload controller - handle audio file upload with metadata
 */

const path = require('path');
const Song = require('../models/Song');
const Room = require('../models/Room');
const uploadService = require('../services/uploadService');
const { getMemberRole, hasPermission } = require('../middleware/roleCheck');
const ApiError = require('../utils/ApiError');

/**
 * Extract duration from file (simplified - actual duration would need ffprobe or similar)
 * For now we store 0 and let frontend/audio element report duration after load
 */
const getDurationFromFile = () => 0;

/**
 * POST /api/rooms/:roomId/upload - Upload audio file
 */
const uploadAudio = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.body.userId || req.user?._id;
    if (!userId) return next(new ApiError(401, 'User ID required'));
    if (!req.file) return next(new ApiError(400, 'No file uploaded'));

    const room = await Room.findById(roomId).populate('members.userId');
    if (!room) return next(new ApiError(404, 'Room not found'));
    if (room.isClosed) return next(new ApiError(400, 'Room is closed'));

    if (!hasPermission(room, userId, 'UPLOAD')) {
      return next(new ApiError(403, 'You do not have permission to add songs. Only the host (or people the host allows) can add to the queue.'));
    }

    await uploadService.canUpload(userId, roomId);
    const order = await uploadService.getNextOrder(roomId);

    const title = req.body.title || path.basename(req.file.originalname, path.extname(req.file.originalname));
    const duration = parseInt(req.body.duration, 10) || getDurationFromFile();

    const song = await Song.create({
      title: title.trim() || 'Untitled',
      artist: (req.body.artist || 'Unknown Artist').trim(),
      duration: Math.max(0, duration),
      filePath: req.file.path.replace(/\\/g, '/'),
      fileName: req.file.filename,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: userId,
      roomId,
      order,
    });

    await uploadService.recordUpload(userId, roomId);

    const populated = await Song.findById(song._id)
      .populate('uploadedBy', 'username profileImage')
      .lean();

    const io = req.app.get('io');
    if (io) {
      const queue = await Song.find({ roomId }).sort({ order: 1 }).populate('uploadedBy', 'username profileImage').lean();
      io.to(roomId.toString()).emit('queue_list', { queue });
    }

    res.status(201).json({ success: true, song: populated });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadAudio };
