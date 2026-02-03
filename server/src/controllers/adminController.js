/**
 * Admin analytics dashboard controller
 */

const Room = require('../models/Room');
const User = require('../models/User');
const Song = require('../models/Song');
const RoomSession = require('../models/RoomSession');
const ApiError = require('../utils/ApiError');

/**
 * GET /api/admin/stats - Aggregate stats for dashboard
 */
const getStats = async (req, res, next) => {
  try {
    if (process.env.ADMIN_ENABLED !== 'true') {
      return next(new ApiError(403, 'Admin dashboard is disabled'));
    }

    const [totalRooms, activeRooms, totalUsers, totalSongs, sessionStats, popularRooms] =
      await Promise.all([
        Room.countDocuments(),
        Room.countDocuments({ isClosed: false }),
        User.countDocuments(),
        Song.countDocuments(),
        RoomSession.aggregate([
          { $match: { endedAt: { $ne: null } } },
          {
            $group: {
              _id: null,
              totalSongsPlayed: { $sum: '$totalSongsPlayed' },
              totalDuration: { $sum: '$durationMinutes' },
              sessionCount: { $sum: 1 },
            },
          },
        ]),
        Room.find({ isClosed: false })
          .populate('hostId', 'username')
          .populate('currentSongId', 'title')
          .sort({ 'members.length': -1 })
          .limit(10)
          .lean(),
      ]);

    const session = sessionStats[0] || {
      totalSongsPlayed: 0,
      totalDuration: 0,
      sessionCount: 0,
    };

    res.json({
      success: true,
      stats: {
        totalRooms,
        activeRooms,
        totalUsers,
        totalSongs,
        totalSongsPlayed: session.totalSongsPlayed,
        totalDurationMinutes: session.totalDuration,
        sessionCount: session.sessionCount,
      },
      popularRooms,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats };
