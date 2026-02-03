import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import styles from './RoomDashboard.module.css';

export default function RoomDashboard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!roomCode) return;
    client
      .get(`/rooms/code/${roomCode.toUpperCase()}`)
      .then(({ data }) => setRoom(data.room))
      .catch(() => setError('Room not found or closed'))
      .finally(() => setLoading(false));
  }, [roomCode]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Enter your username');
      return;
    }
    setJoining(true);
    setError('');
    try {
      const { data } = await client.post('/rooms/join', {
        roomCode: roomCode.toUpperCase(),
        password: password || undefined,
        username: username.trim(),
      });
      localStorage.setItem('musicRoom_lastRoom', data.room.roomCode);
      localStorage.setItem('musicRoom_lastRoomName', data.room.name || '');
      navigate(`/room/${data.room.roomCode}/play`, { state: { room: data.room, user: data.user } });
    } catch (err) {
      setError(err.message || 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading room…</div>;
  if (error && !room) return <div className={styles.error}>{error}</div>;
  if (!room) return null;

  return (
    <div className={styles.dashboard}>
      <div className={styles.card}>
        <h1>{room.name}</h1>
        {room.description && <p className={styles.desc}>{room.description}</p>}
        <div className={styles.meta}>
          <span className={styles.code}>Room code: {room.roomCode}</span>
          <span>Host: {room.hostId?.username || '—'}</span>
          <span>Members: {room.members?.length || 0}</span>
          <span>Privacy: {room.visibility === 'public' ? 'Public' : 'Private'}</span>
          {room.currentSongId && (
            <span>Now playing: {room.currentSongId.title || '—'}</span>
          )}
        </div>

        <form onSubmit={handleJoin} className={styles.form}>
          <label>
            Your username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your name"
              maxLength={30}
            />
          </label>
          {room.isPasswordProtected && (
            <label>
              Room password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
            </label>
          )}
          {error && <div className={styles.errMsg}>{error}</div>}
          <button type="submit" className={styles.primaryBtn} disabled={joining}>
            {joining ? 'Joining…' : 'Join room'}
          </button>
        </form>
      </div>
    </div>
  );
}
