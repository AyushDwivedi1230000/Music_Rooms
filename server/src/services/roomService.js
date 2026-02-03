/**
 * Room business logic - create, join, leave, get room state
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Room = require('../models/Room');
const User = require('../models/User');
const Song = require('../models/Song');
const { generateUniqueRoomCode } = require('../utils/generateRoomCode');
const { ROLES, ROOM_VISIBILITY } = require('../config/constants');
const ApiError = require('../utils/ApiError');
const RoomSession = require('../models/RoomSession');

/**
 * Create a new room
 */
const createRoom = async (data) => {
  if (mongoose.connection.readyState !== 1) {
    throw new ApiError(
      503,
      'Database not connected. Please start MongoDB (run "mongod" or start MongoDB service), then restart the server.'
    );
  }
  const { name, description, visibility, password, username, hostId } = data;
  const roomCode = await generateUniqueRoomCode();

  let passwordHash = null;
  let isPasswordProtected = false;
  if (password && password.length >= 4) {
    passwordHash = await bcrypt.hash(password, 10);
    isPasswordProtected = true;
  }

  // Create or use existing user
  let user = hostId ? await User.findById(hostId) : null;
  if (!user) {
    user = await User.create({
      username: username.trim(),
      isGuest: true,
    });
  }

  const room = await Room.create({
    name: name.trim(),
    description: (description || '').trim(),
    roomCode,
    passwordHash,
    isPasswordProtected,
    visibility: visibility || ROOM_VISIBILITY.PUBLIC,
    hostId: user._id,
    members: [{ userId: user._id, role: ROLES.HOST }],
  });

  await User.findByIdAndUpdate(user._id, {
    currentRoomId: room._id,
    lastSeen: new Date(),
  });

  // Start session for analytics
  await RoomSession.create({
    roomId: room._id,
    roomCode: room.roomCode,
    peakUsers: 1,
  });

  const populated = await Room.findById(room._id)
    .populate('hostId', 'username profileImage isGuest')
    .populate('members.userId', 'username profileImage isGuest')
    .populate('currentSongId')
    .lean();

  return { room: populated, user };
};

/**
 * Join room - verify password if protected
 */
const joinRoom = async (roomCode, password, username, userId) => {
  const code = roomCode.trim().toUpperCase();
  const room = await Room.findOne({ roomCode: code, isClosed: false })
    .populate('hostId', 'username profileImage isGuest')
    .populate('members.userId', 'username profileImage isGuest')
    .populate('currentSongId');

  if (!room) {
    throw new ApiError(404, 'Room not found or closed');
  }

  if (room.isPasswordProtected) {
    const RoomWithPassword = await Room.findOne({ roomCode: code }).select('+passwordHash');
    const valid = await bcrypt.compare(password || '', RoomWithPassword.passwordHash);
    if (!valid) {
      throw new ApiError(401, 'Invalid room password');
    }
  }

  let user = userId ? await User.findById(userId) : null;
  if (!user) {
    user = await User.create({
      username: username.trim(),
      isGuest: true,
    });
  }

  const alreadyMember = room.members.some(
    (m) => m.userId._id.toString() === user._id.toString()
  );
  if (!alreadyMember) {
    room.members.push({ userId: user._id, role: ROLES.LISTENER });
    await room.save();
  }

  await User.findByIdAndUpdate(user._id, {
    currentRoomId: room._id,
    lastSeen: new Date(),
  });

  const updated = await Room.findById(room._id)
    .populate('hostId', 'username profileImage isGuest')
    .populate('members.userId', 'username profileImage isGuest')
    .populate('currentSongId')
    .lean();

  return { room: updated, user };
};

/**
 * Get room by code (for dashboard before joining)
 */
const getRoomByCode = async (roomCode) => {
  const code = roomCode.trim().toUpperCase();
  const room = await Room.findOne({ roomCode: code, isClosed: false })
    .populate('hostId', 'username profileImage isGuest')
    .populate('members.userId', 'username profileImage isGuest')
    .populate('currentSongId', 'title artist duration')
    .select('-passwordHash')
    .lean();

  if (!room) return null;
  return room;
};

/**
 * Get full room state including queue (songs in room)
 */
const getRoomState = async (roomId) => {
  const room = await Room.findById(roomId)
    .populate('hostId', 'username profileImage isGuest')
    .populate('members.userId', 'username profileImage isGuest socketId')
    .populate('currentSongId')
    .lean();

  if (!room) return null;

  const queue = await Song.find({ roomId }).sort({ order: 1 }).lean();
  return { ...room, queue };
};

/**
 * Leave room
 */
const leaveRoom = async (userId, roomId) => {
  const room = await Room.findById(roomId);
  if (!room) return null;

  room.members = room.members.filter((m) => m.userId.toString() !== userId.toString());
  await room.save();

  await User.findByIdAndUpdate(userId, { currentRoomId: null, lastSeen: new Date() });

  // If host left, assign new host or close
  if (room.hostId.toString() === userId.toString()) {
    if (room.members.length > 0) {
      room.hostId = room.members[0].userId;
      const firstMember = room.members[0];
      firstMember.role = ROLES.HOST;
      await room.save();
    } else {
      await closeRoom(roomId);
    }
  }

  return room;
};

/**
 * Close room (host only)
 */
const closeRoom = async (roomId, userId) => {
  const room = await Room.findById(roomId);
  if (!room) return null;
  if (room.hostId.toString() !== userId.toString()) {
    throw new ApiError(403, 'Only host can close the room');
  }

  await Room.findByIdAndUpdate(roomId, { isClosed: true });

  await RoomSession.findOneAndUpdate(
    { roomId },
    { endedAt: new Date(), durationMinutes: 0 },
    { sort: { createdAt: -1 } }
  );
  return { closed: true };
};

/**
 * Update room settings (host only), e.g. whoCanUpload: 'host' | 'host_cohost' | 'all'
 */
const updateRoomSettings = async (roomId, userId, updates) => {
  const room = await Room.findById(roomId);
  if (!room) return null;
  if (room.hostId.toString() !== userId.toString()) {
    throw new ApiError(403, 'Only host can change room settings');
  }
  const { whoCanUpload } = updates;
  const set = {};
  if (whoCanUpload && ['host', 'host_cohost', 'all'].includes(whoCanUpload)) {
    set.whoCanUpload = whoCanUpload;
  }
  if (Object.keys(set).length === 0) return room;
  const updated = await Room.findByIdAndUpdate(
    roomId,
    { $set: set },
    { new: true }
  )
    .populate('hostId', 'username profileImage isGuest')
    .populate('members.userId', 'username profileImage isGuest')
    .populate('currentSongId')
    .lean();
  return updated;
};

/**
 * List public rooms (for discovery)
 */
const listPublicRooms = async () => {
  const rooms = await Room.find({
    visibility: ROOM_VISIBILITY.PUBLIC,
    isClosed: false,
  })
    .populate('hostId', 'username profileImage')
    .populate('currentSongId', 'title artist duration')
    .select('-passwordHash')
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  return rooms;
};

module.exports = {
  createRoom,
  joinRoom,
  getRoomByCode,
  getRoomState,
  leaveRoom,
  closeRoom,
  updateRoomSettings,
  listPublicRooms,
};
