import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useRoom } from '../context/RoomContext';
import { useSocket } from '../context/SocketContext';
import Player from '../components/Player';
import Queue from '../components/Queue';
import Chat from '../components/Chat';
import Sidebar from '../components/Sidebar';
import UploadModal from '../components/UploadModal';
import Settings from '../components/Settings';
import { hasPermission } from '../utils/roles';
import styles from './Room.module.css';

export default function Room() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    room,
    user,
    setRoom,
    setUser,
    setQueue,
    setPlayback,
    setMembers,
    loadRoomState,
  } = useRoom();
  const { getSocket } = useSocket();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [synced, setSynced] = useState(false);

  const roomId = room?._id;

  // If we have roomCode in URL but no room/user (e.g. refresh or new tab), send to dashboard to rejoin
  useEffect(() => {
    if (roomCode && !room && !user && !location.state?.room) {
      navigate(`/room/${roomCode}`, { replace: true });
    }
  }, [roomCode, room, user, location.state, navigate]);

  useEffect(() => {
    const state = location.state;
    if (state?.room && state?.user) {
      setRoom(state.room);
      setUser(state.user);
      setMembers(state.room.members || []);
      setQueue(state.room.queue || []);
      setPlayback({
        currentSong: state.room.currentSongId ? state.room.currentSong : null,
        currentTime: state.room.currentTime ?? 0,
        isPlaying: state.room.isPlaying ?? false,
        lastUpdated: state.room.lastUpdated,
      });
    }
  }, [location.state, setRoom, setUser, setMembers, setQueue, setPlayback]);

  useEffect(() => {
    if (!room?._id || !user?._id) return;

    loadRoomState(room._id)
      .then((data) => {
        setQueue(data.queue || []);
        setMembers(data.members || []);
        setPlayback({
          currentSong: data.currentSongId ? data.currentSong : null,
          currentTime: data.currentTime ?? 0,
          isPlaying: data.isPlaying ?? false,
          lastUpdated: data.lastUpdated,
        });
      })
      .catch(() => {});
  }, [room?._id, user?._id, loadRoomState, setQueue, setMembers, setPlayback]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !roomId || !user) return;

    socket.emit(
      'join_room',
      {
        roomId,
        userId: user._id,
        username: user.username,
      },
      (res) => {
        if (res?.error) {
          console.error(res.error);
          navigate('/');
          return;
        }
        if (res?.state) {
          setPlayback((p) => ({
            ...p,
            currentTime: res.state.currentTime ?? p.currentTime,
            isPlaying: res.state.isPlaying ?? p.isPlaying,
            currentSong: res.state.currentSong ?? p.currentSong,
            lastUpdated: res.state.lastUpdated,
          }));
        }
        setSynced(true);
      }
    );

    const onKicked = (data) => {
      if (data.roomId === roomId) navigate('/');
    };

    socket.on('kicked_from_room', onKicked);
    return () => {
      socket.emit('leave_room', { roomId, userId: user._id, username: user.username });
      socket.off('kicked_from_room', onKicked);
    };
  }, [getSocket, roomId, user, setPlayback, navigate]);

  const canUpload = room && user && hasPermission(room, user._id, 'UPLOAD');
  const canSkip = room && user && hasPermission(room, user._id, 'SKIP');

  const handleVoteSkip = useCallback(() => {
    const socket = getSocket();
    if (socket && roomId && user?._id) {
      socket.emit('vote_skip', { roomId, userId: user._id }, (res) => {
        if (res?.error) console.error(res.error);
      });
    }
  }, [getSocket, roomId, user]);

  const handleSkip = useCallback(() => {
    const socket = getSocket();
    if (socket && roomId && user?._id && canSkip) {
      socket.emit('skip', { roomId, userId: user._id }, (res) => {
        if (res?.error) console.error(res.error);
      });
    }
  }, [getSocket, roomId, user, canSkip]);

  if (!room || !user) {
    return (
      <div className={styles.loading}>
        <p>Loading room…</p>
        <button type="button" onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className={styles.room}>
      <div className={styles.header}>
        <h1>{room.name}</h1>
        <span className={styles.code}>{room.roomCode}</span>
        <div className={styles.actions}>
          {canUpload && (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => setUploadOpen(true)}
            >
              Upload
            </button>
          )}
          <button type="button" className={styles.skipBtn} onClick={handleSkip} disabled={!canSkip}>
            Next
          </button>
          <button type="button" className={styles.voteSkipBtn} onClick={handleVoteSkip} title="Vote to skip">
            Vote skip
          </button>
          <button type="button" className={styles.settingsBtn} onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        <aside className={styles.sidebar}>
          <Sidebar />
        </aside>
        <section className={styles.playerSection}>
          <Player />
        </section>
        <section className={styles.queueSection}>
          <Queue />
        </section>
        <section className={styles.chatSection}>
          <Chat />
        </section>
      </div>

      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
