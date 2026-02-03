/**
 * Generate unique 6-character room code (alphanumeric uppercase)
 */

const Room = require('../models/Room');

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous 0,O,1,I

const generateCode = () => {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
};

/**
 * Generate a unique room code that doesn't exist in DB
 */
const generateUniqueRoomCode = async () => {
  let code = generateCode();
  let attempts = 0;
  const maxAttempts = 50;

  while (attempts < maxAttempts) {
    const exists = await Room.findOne({ roomCode: code });
    if (!exists) return code;
    code = generateCode();
    attempts++;
  }

  throw new Error('Could not generate unique room code');
};

module.exports = { generateUniqueRoomCode, generateCode };
