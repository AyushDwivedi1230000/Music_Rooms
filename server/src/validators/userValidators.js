/**
 * Validation rules for user-related requests
 */

const { body } = require('express-validator');

const createUser = [
  body('username')
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('Username must be 2-30 characters')
    .matches(/^[a-zA-Z0-9_\-\s]+$/)
    .withMessage('Username can only contain letters, numbers, spaces, - and _'),
];

const login = [
  body('email').trim().isEmail(),
  body('password').notEmpty(),
];

module.exports = { createUser, login };
