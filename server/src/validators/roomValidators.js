/**
 * Validation rules for room-related requests
 */

const { body, param, query } = require('express-validator');

const createRoom = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('visibility').optional().isIn(['public', 'private']),
  body('password').optional().trim().isLength({ min: 4, max: 50 }),
  body('hostId').optional().isMongoId(),
  body('username').trim().notEmpty().withMessage('Username is required'),
];

const joinRoom = [
  body('roomCode').trim().isLength({ min: 6, max: 6 }).withMessage('Room code must be 6 characters'),
  body('password').optional().trim(),
  body('userId').optional().isMongoId(),
  body('username').trim().notEmpty().withMessage('Username is required'),
];

const roomCodeParam = [
  param('roomCode').trim().isLength({ min: 6, max: 6 }),
];

const updateRoom = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('visibility').optional().isIn(['public', 'private']),
];

module.exports = {
  createRoom,
  joinRoom,
  roomCodeParam,
  updateRoom,
};
