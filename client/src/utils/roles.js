/**
 * Role/permission helpers for frontend (mirror backend constants)
 */

const ROLES = { HOST: 'host', COHOST: 'cohost', LISTENER: 'listener' };

const PERMISSIONS = {
  UPLOAD: ['host', 'cohost'],
  REMOVE_SONG: ['host'],
  SKIP: ['host', 'cohost'],
  REORDER_QUEUE: ['host', 'cohost'],
  PROMOTE_USER: ['host'],
  KICK_USER: ['host'],
  CLOSE_ROOM: ['host'],
  PLAY: ['host', 'cohost', 'listener'],
};

function getMemberRole(room, userId) {
  if (!room?.members) return null;
  const member = room.members.find(
    (m) => m.userId?._id?.toString() === userId?.toString()
  );
  return member ? member.role : null;
}

function hasPermission(room, userId, permission) {
  const role = getMemberRole(room, userId);
  if (!role) return false;
  // UPLOAD: use room setting whoCanUpload if set (host | host_cohost | all)
  if (permission === 'UPLOAD' && room.whoCanUpload) {
    if (room.whoCanUpload === 'all') return true;
    if (room.whoCanUpload === 'host') return role === ROLES.HOST;
    if (room.whoCanUpload === 'host_cohost') return [ROLES.HOST, ROLES.COHOST].includes(role);
  }
  const allowed = PERMISSIONS[permission];
  return allowed && allowed.includes(role);
}

function isHost(room, userId) {
  return room?.hostId?._id?.toString() === userId?.toString();
}

export { ROLES, PERMISSIONS, getMemberRole, hasPermission, isHost };
