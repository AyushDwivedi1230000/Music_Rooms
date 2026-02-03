/**
 * Role and permission verification middleware
 * Used in Socket handlers and API routes
 */

const { PERMISSIONS, ROLES } = require('../config/constants');
const ApiError = require('../utils/ApiError');

/**
 * Normalize member userId for comparison (handles populated and unpopulated refs)
 */
const memberUserId = (m) => {
  if (!m || !m.userId) return null;
  const id = m.userId._id || m.userId;
  return id.toString();
};

/**
 * Get user role in a room (from room.members)
 */
const getMemberRole = (room, userId) => {
  if (!room || !room.members) return null;
  const uid = userId && (userId.toString ? userId.toString() : String(userId));
  const member = room.members.find((m) => memberUserId(m) === uid);
  return member ? member.role : null;
};

/**
 * Check if user has a specific permission in the room.
 * For UPLOAD, uses room.whoCanUpload if set: 'host' | 'host_cohost' | 'all'.
 */
const hasPermission = (room, userId, permission) => {
  const role = getMemberRole(room, userId);
  if (!role) return false;
  if (permission === 'UPLOAD' && room.whoCanUpload) {
    if (room.whoCanUpload === 'all') return true;
    if (room.whoCanUpload === 'host') return role === ROLES.HOST;
    if (room.whoCanUpload === 'host_cohost') return [ROLES.HOST, ROLES.COHOST].includes(role);
  }
  const allowed = PERMISSIONS[permission];
  return allowed && allowed.includes(role);
};

/**
 * Express middleware: require permission in room (room must be in req.room, user in req.user or body)
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    const room = req.room;
    const userId = req.user?._id || req.body?.userId;
    if (!room) return next(new ApiError(404, 'Room not found'));
    if (!userId) return next(new ApiError(401, 'User not found'));

    if (hasPermission(room, userId, permission)) {
      return next();
    }
    next(new ApiError(403, 'You do not have permission for this action'));
  };
};

/**
 * Check if user is host
 */
const isHost = (room, userId) => {
  return room && room.hostId && room.hostId.toString() === userId.toString();
};

module.exports = {
  getMemberRole,
  hasPermission,
  requirePermission,
  isHost,
  ROLES,
  PERMISSIONS,
};
