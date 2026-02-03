/**
 * Socket.io setup and room namespace handlers
 * Real-time: playback sync, chat, queue, user join/leave
 */

const Room = require('../models/Room');
const User = require('../models/User');
const Song = require('../models/Song');
const ChatMessage = require('../models/ChatMessage');
const { getMemberRole, hasPermission, isHost, ROLES } = require('../middleware/roleCheck');
const { VOTE_SKIP_THRESHOLD } = require('../config/constants');

/**
 * Attach Socket.io to HTTP server and register handlers
 */
function setupSockets(io) {
  io.on('connection', (socket) => {
    socket.on('join_room', async (payload, callback) => {
      try {
        const { roomId, userId, username } = payload || {};
        if (!roomId) {
          return callback?.({ error: 'roomId required' });
        }

        const room = await Room.findById(roomId)
          .populate('hostId', 'username profileImage')
          .populate('members.userId', 'username profileImage socketId')
          .populate('currentSongId');

        if (!room || room.isClosed) {
          return callback?.({ error: 'Room not found or closed' });
        }

        const uid = userId || socket.id;
        const member = room.members.find((m) => {
          const mid = (m.userId?._id || m.userId)?.toString();
          return mid === uid;
        });
        if (!member && userId) {
          const userInRoom = room.members.some((m) => (m.userId?._id || m.userId)?.toString() === userId);
          if (!userInRoom) return callback?.({ error: 'Not a member' });
        }

        await socket.join(roomId);

        await User.findByIdAndUpdate(userId || socket.id, {
          socketId: socket.id,
          lastSeen: new Date(),
        });

        const state = {
          currentSongId: room.currentSongId?._id || null,
          currentSong: room.currentSongId,
          currentTime: room.currentTime,
          isPlaying: room.isPlaying,
          lastUpdated: room.lastUpdated,
        };

        callback?.({ success: true, state, room });

        socket.to(roomId).emit('user_joined', {
          userId: userId || socket.id,
          username: username || 'Guest',
          memberCount: room.members.length,
        });
      } catch (err) {
        callback?.({ error: err.message || 'Failed to join' });
      }
    });

    socket.on('leave_room', async (payload) => {
      const { roomId, userId, username } = payload || {};
      if (roomId) {
        socket.leave(roomId);
        const room = await Room.findById(roomId);
        if (room && userId) {
          socket.to(roomId).emit('user_left', {
            userId,
            username: username || 'User',
            memberCount: Math.max(0, room.members.length - 1),
          });
        }
      }
    });

    socket.on('playback_state', async (payload) => {
      const { roomId, userId, currentTime, isPlaying } = payload || {};
      if (!roomId || userId === undefined) return;

      const room = await Room.findById(roomId);
      if (!room || room.isClosed) return;
      if (!hasPermission(room, userId, 'PLAY')) return;

      room.currentTime = typeof currentTime === 'number' ? currentTime : room.currentTime;
      room.isPlaying = !!isPlaying;
      room.lastUpdated = new Date();
      await room.save();

      socket.to(roomId).emit('playback_sync', {
        currentTime: room.currentTime,
        isPlaying: room.isPlaying,
        lastUpdated: room.lastUpdated,
      });
    });

    socket.on('seek', async (payload) => {
      const { roomId, userId, currentTime } = payload || {};
      if (!roomId || typeof currentTime !== 'number') return;

      const room = await Room.findById(roomId);
      if (!room || room.isClosed) return;
      if (!hasPermission(room, userId, 'PLAY')) return;

      room.currentTime = currentTime;
      room.lastUpdated = new Date();
      await room.save();

      io.to(roomId).emit('seek_sync', {
        currentTime: room.currentTime,
        lastUpdated: room.lastUpdated,
      });
    });

    socket.on('skip', async (payload, callback) => {
      try {
        const { roomId, userId } = payload || {};
        if (!roomId || !userId) return callback?.({ error: 'roomId and userId required' });

        const room = await Room.findById(roomId).populate('currentSongId');
        if (!room || room.isClosed) return callback?.({ error: 'Room not found' });

        if (!hasPermission(room, userId, 'SKIP')) {
          return callback?.({ error: 'No permission to skip' });
        }

        const queue = await Song.find({ roomId }).sort({ order: 1 });
        const currentIndex = queue.findIndex(
          (s) => s._id.toString() === (room.currentSongId?._id || room.currentSongId)?.toString()
        );
        const nextSong = queue[currentIndex + 1] || queue[0] || null;

        room.currentSongId = nextSong?._id || null;
        room.currentTime = 0;
        room.isPlaying = nextSong ? true : false;
        room.lastUpdated = new Date();
        room.skipVotes = [];
        await room.save();

        const nextPopulated = nextSong
          ? await Song.findById(nextSong._id).populate('uploadedBy', 'username').lean()
          : null;

        io.to(roomId).emit('queue_updated', {
          currentSong: nextPopulated,
          currentTime: 0,
          isPlaying: !!nextSong,
          lastUpdated: room.lastUpdated,
        });

        callback?.({ success: true, currentSong: nextPopulated });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    socket.on('vote_skip', async (payload, callback) => {
      try {
        const { roomId, userId } = payload || {};
        if (!roomId || !userId) return callback?.({ error: 'Invalid payload' });

        const room = await Room.findById(roomId);
        if (!room || room.isClosed) return callback?.({ error: 'Room not found' });

        const already = room.skipVotes.some((v) => v.userId.toString() === userId);
        if (!already) {
          room.skipVotes.push({ userId, votedAt: new Date() });
          await room.save();
        }

        const listeners = room.members.filter(
          (m) => m.role === ROLES.LISTENER || m.role === ROLES.COHOST
        ).length;
        const threshold = Math.max(1, Math.ceil(listeners * VOTE_SKIP_THRESHOLD));
        const votes = room.skipVotes.length;

        if (votes >= threshold) {
          const queue = await Song.find({ roomId }).sort({ order: 1 });
          const currentId = room.currentSongId?.toString();
          const currentIndex = queue.findIndex((s) => s._id.toString() === currentId);
          const nextSong = queue[currentIndex + 1] || queue[0] || null;

          room.currentSongId = nextSong?._id || null;
          room.currentTime = 0;
          room.isPlaying = !!nextSong;
          room.skipVotes = [];
          room.lastUpdated = new Date();
          await room.save();

          const nextPopulated = nextSong
            ? await Song.findById(nextSong._id).populate('uploadedBy', 'username').lean()
            : null;

          io.to(roomId).emit('queue_updated', {
            currentSong: nextPopulated,
            currentTime: 0,
            isPlaying: !!nextSong,
            lastUpdated: room.lastUpdated,
            voteSkipped: true,
          });
        }

        callback?.({ success: true, votes, threshold });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    socket.on('chat_message', async (payload, callback) => {
      try {
        const { roomId, userId, username, message } = payload || {};
        if (!roomId || !message || !username) {
          return callback?.({ error: 'roomId, username and message required' });
        }

        const trimmed = String(message).trim().slice(0, 1000);
        if (!trimmed) return callback?.({ error: 'Message cannot be empty' });

        const room = await Room.findById(roomId);
        if (!room || room.isClosed) return callback?.({ error: 'Room not found' });

        const doc = await ChatMessage.create({
          roomId,
          userId: userId || null,
          username: trimmed.length ? username : 'Guest',
          message: trimmed,
          isSystem: false,
        });

        const msg = {
          _id: doc._id,
          userId: doc.userId,
          username: doc.username,
          message: doc.message,
          isSystem: false,
          createdAt: doc.createdAt,
        };

        io.to(roomId).emit('chat_message', msg);
        callback?.({ success: true, message: msg });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    socket.on('queue_reorder', async (payload, callback) => {
      try {
        const { roomId, userId, songIds } = payload || {};
        if (!roomId || !userId || !Array.isArray(songIds)) {
          return callback?.({ error: 'roomId, userId and songIds array required' });
        }

        const room = await Room.findById(roomId);
        if (!room || room.isClosed) return callback?.({ error: 'Room not found' });

        if (!hasPermission(room, userId, 'REORDER_QUEUE')) {
          return callback?.({ error: 'No permission to reorder' });
        }

        for (let i = 0; i < songIds.length; i++) {
          await Song.updateOne({ _id: songIds[i], roomId }, { order: i });
        }

        const queue = await Song.find({ roomId }).sort({ order: 1 }).populate('uploadedBy', 'username').lean();
        io.to(roomId).emit('queue_list', { queue });
        callback?.({ success: true, queue });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    socket.on('remove_song', async (payload, callback) => {
      try {
        const { roomId, userId, songId } = payload || {};
        if (!roomId || !userId || !songId) return callback?.({ error: 'Invalid payload' });

        const room = await Room.findById(roomId);
        if (!room || room.isClosed) return callback?.({ error: 'Room not found' });

        if (!hasPermission(room, userId, 'REMOVE_SONG')) {
          return callback?.({ error: 'No permission to remove song' });
        }

        const song = await Song.findOne({ _id: songId, roomId });
        if (!song) return callback?.({ error: 'Song not found' });

        const wasCurrent = room.currentSongId?.toString() === songId;
        await Song.deleteOne({ _id: songId, roomId });

        if (wasCurrent) {
          const queue = await Song.find({ roomId }).sort({ order: 1 });
          const nextSong = queue[0] || null;
          room.currentSongId = nextSong?._id || null;
          room.currentTime = 0;
          room.isPlaying = !!nextSong;
          room.lastUpdated = new Date();
          await room.save();
        }

        const queue = await Song.find({ roomId }).sort({ order: 1 }).populate('uploadedBy', 'username').lean();
        io.to(roomId).emit('queue_list', { queue });
        io.to(roomId).emit('queue_updated', {
          currentSong: wasCurrent && room.currentSongId ? await Song.findById(room.currentSongId).populate('uploadedBy', 'username').lean() : null,
          currentTime: wasCurrent ? 0 : room.currentTime,
          isPlaying: wasCurrent ? !!room.currentSongId : room.isPlaying,
          lastUpdated: room.lastUpdated,
        });

        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    socket.on('song_vote', async (payload, callback) => {
      try {
        const { roomId, songId, userId, vote } = payload || {};
        if (!roomId || !songId || !userId || (vote !== 1 && vote !== -1)) {
          return callback?.({ error: 'Invalid payload' });
        }

        const song = await Song.findOne({ _id: songId, roomId });
        if (!song) return callback?.({ error: 'Song not found' });

        const existing = song.userVotes.find((v) => v.userId.toString() === userId);
        if (existing) {
          if (existing.vote === vote) {
            song.userVotes.pull(existing);
            if (vote === 1) song.likes = Math.max(0, song.likes - 1);
            else song.dislikes = Math.max(0, song.dislikes - 1);
          } else {
            existing.vote = vote;
            if (vote === 1) {
              song.likes += 1;
              song.dislikes = Math.max(0, song.dislikes - 1);
            } else {
              song.dislikes += 1;
              song.likes = Math.max(0, song.likes - 1);
            }
          }
        } else {
          song.userVotes.push({ userId, vote });
          if (vote === 1) song.likes += 1;
          else song.dislikes += 1;
        }

        await song.save();

        io.to(roomId).emit('song_vote_updated', {
          songId,
          likes: song.likes,
          dislikes: song.dislikes,
        });
        callback?.({ success: true, likes: song.likes, dislikes: song.dislikes });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    socket.on('promote_user', async (payload, callback) => {
      try {
        const { roomId, userId, targetUserId, role } = payload || {};
        if (!roomId || !userId || !targetUserId) return callback?.({ error: 'Invalid payload' });

        const room = await Room.findById(roomId);
        if (!room || room.isClosed) return callback?.({ error: 'Room not found' });

        if (!isHost(room, userId)) {
          return callback?.({ error: 'Only host can promote users' });
        }

        const member = room.members.find((m) => m.userId.toString() === targetUserId);
        if (!member) return callback?.({ error: 'User not in room' });

        const newRole = role === ROLES.COHOST ? ROLES.COHOST : ROLES.LISTENER;
        member.role = newRole;
        await room.save();

        io.to(roomId).emit('member_role_updated', { userId: targetUserId, role: newRole });
        callback?.({ success: true, role: newRole });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    socket.on('kick_user', async (payload, callback) => {
      try {
        const { roomId, userId, targetUserId } = payload || {};
        if (!roomId || !userId || !targetUserId) return callback?.({ error: 'Invalid payload' });

        const room = await Room.findById(roomId);
        if (!room || room.isClosed) return callback?.({ error: 'Room not found' });

        if (!hasPermission(room, userId, 'KICK_USER')) {
          return callback?.({ error: 'No permission to kick' });
        }

        const targetMember = room.members.find((m) => m.userId.toString() === targetUserId);
        if (!targetMember) return callback?.({ error: 'User not in room' });

        room.members = room.members.filter((m) => m.userId.toString() !== targetUserId);
        await room.save();

        const targetSocketId = await User.findById(targetUserId).select('socketId').lean();
        if (targetSocketId?.socketId) {
          io.to(targetSocketId.socketId).emit('kicked_from_room', { roomId });
        }

        const kickedUser = await User.findById(targetUserId).select('username').lean();
        io.to(roomId).emit('user_left', {
          userId: targetUserId,
          username: kickedUser?.username || 'User',
          memberCount: room.members.length,
        });
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    socket.on('disconnect', async () => {
      // Optional: mark user offline, leave room in DB handled by explicit leave or timeout
    });
  });

  return io;
}

module.exports = { setupSockets };
