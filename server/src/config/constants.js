/**
 * Application constants - avoid hardcoding across codebase
 */

// Roles and permissions
const ROLES = {
  HOST: 'host',
  COHOST: 'cohost',
  LISTENER: 'listener',
};

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

// Room visibility
const ROOM_VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
};

// Allowed audio MIME types
const ALLOWED_AUDIO_MIME = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
];

// File upload limits
const UPLOAD = {
  MAX_SIZE: parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 10 * 1024 * 1024, // 10MB
  COOLDOWN_MS: 30000, // 30 seconds between uploads per user
  MAX_PER_USER_PER_ROOM: 20, // max tracks per user per room
};

// Vote threshold for auto-skip
const VOTE_SKIP_THRESHOLD = 0.5; // 50% of listeners

// JWT
const JWT_EXPIRY = '7d';

module.exports = {
  ROLES,
  PERMISSIONS,
  ROOM_VISIBILITY,
  ALLOWED_AUDIO_MIME,
  UPLOAD,
  VOTE_SKIP_THRESHOLD,
  JWT_EXPIRY,
};
