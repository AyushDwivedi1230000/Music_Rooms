/**
 * Room API controller - create, join, get room, list public rooms
 */

const roomService = require('../services/roomService');
const ApiError = require('../utils/ApiError');

/**
 * POST /api/rooms - Create room
 */
const createRoom = async (req, res, next) => {
  try {
    const { name, description, visibility, password, username, hostId } = req.body;
    const result = await roomService.createRoom({
      name,
      description,
      visibility,
      password,
      username,
      hostId: hostId || req.user?._id,
    });
    res.status(201).json({
      success: true,
      room: result.room,
      user: {
        _id: result.user._id,
        username: result.user.username,
        profileImage: result.user.profileImage,
        isGuest: result.user.isGuest,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/rooms/join - Join room
 */
const joinRoom = async (req, res, next) => {
  try {
    const { roomCode, password, username, userId } = req.body;
    const result = await roomService.joinRoom(
      roomCode,
      password,
      username,
      userId || req.user?._id
    );
    res.json({
      success: true,
      room: result.room,
      user: {
        _id: result.user._id,
        username: result.user.username,
        profileImage: result.user.profileImage,
        isGuest: result.user.isGuest,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/rooms/code/:roomCode - Get room info (dashboard before joining)
 */
const getRoomByCode = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    const room = await roomService.getRoomByCode(roomCode);
    if (!room) {
      return next(new ApiError(404, 'Room not found'));
    }
    res.json({ success: true, room });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/rooms/:roomId/state - Get full room state + queue (auth by room membership)
 */
const getRoomState = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const state = await roomService.getRoomState(roomId);
    if (!state) {
      return next(new ApiError(404, 'Room not found'));
    }
    res.json({ success: true, ...state });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/rooms - List public rooms
 */
const listPublicRooms = async (req, res, next) => {
  try {
    const rooms = await roomService.listPublicRooms();
    res.json({ success: true, rooms });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/rooms/:roomId/leave - Leave room
 */
const leaveRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.body.userId || req.user?._id;
    if (!userId) return next(new ApiError(401, 'User ID required'));
    await roomService.leaveRoom(userId, roomId);
    res.json({ success: true, message: 'Left room' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/rooms/:roomId/close - Close room (host only)
 */
const closeRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.body.userId || req.user?._id;
    if (!userId) return next(new ApiError(401, 'User ID required'));
    await roomService.closeRoom(roomId, userId);
    res.json({ success: true, message: 'Room closed' });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/rooms/:roomId/settings - Update room settings (host only), e.g. whoCanUpload
 */
const updateRoomSettings = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { whoCanUpload, userId } = req.body;
    const uid = userId || req.user?._id;
    if (!uid) return next(new ApiError(401, 'User ID required'));
    const room = await roomService.updateRoomSettings(roomId, uid, { whoCanUpload });
    if (!room) return next(new ApiError(404, 'Room not found'));
    res.json({ success: true, room });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createRoom,
  joinRoom,
  getRoomByCode,
  getRoomState,
  listPublicRooms,
  leaveRoom,
  closeRoom,
  updateRoomSettings,
};
