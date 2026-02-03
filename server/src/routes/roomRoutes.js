/**
 * Room API routes
 */

const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const roomValidators = require('../validators/roomValidators');
const validate = require('../middleware/validate');
const { optionalAuth } = require('../middleware/auth');

router.post('/rooms', roomValidators.createRoom, validate, roomController.createRoom);
router.post('/rooms/join', roomValidators.joinRoom, validate, roomController.joinRoom);
router.get('/rooms/code/:roomCode', roomValidators.roomCodeParam, validate, roomController.getRoomByCode);
router.get('/rooms', roomController.listPublicRooms);
router.get('/rooms/:roomId/state', roomController.getRoomState);
router.post('/rooms/:roomId/leave', roomController.leaveRoom);
router.post('/rooms/:roomId/close', roomController.closeRoom);
router.patch('/rooms/:roomId/settings', roomController.updateRoomSettings);

module.exports = router;
