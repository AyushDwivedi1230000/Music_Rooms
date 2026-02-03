import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import styles from './Home.module.css';

const LAST_ROOM_KEY = 'musicRoom_lastRoom';
const LAST_ROOM_NAME_KEY = 'musicRoom_lastRoomName';

export default function Home() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('join'); // 'join' | 'create'
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinUsername, setJoinUsername] = useState('');
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createUsername, setCreateUsername] = useState('');
  const [createVisibility, setCreateVisibility] = useState('public');
  const [publicRooms, setPublicRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRoom, setLastRoom] = useState(() => ({
    code: localStorage.getItem(LAST_ROOM_KEY) || '',
    name: localStorage.getItem(LAST_ROOM_NAME_KEY) || '',
  }));

  useEffect(() => {
    client.get('/rooms').then(({ data }) => setPublicRooms(data.rooms || [])).catch(() => setPublicRooms([]));
  }, []);

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    if (!joinCode.trim() || !joinUsername.trim()) {
      setError('Room code and username required');
      return;
    }
    setLoading(true);
    try {
      const { data } = await client.post('/rooms/join', {
        roomCode: joinCode.trim().toUpperCase(),
        password: joinPassword || undefined,
        username: joinUsername.trim(),
      });
      localStorage.setItem(LAST_ROOM_KEY, data.room.roomCode);
      localStorage.setItem(LAST_ROOM_NAME_KEY, data.room.name || '');
      setLastRoom({ code: data.room.roomCode, name: data.room.name || '' });
      navigate(`/room/${data.room.roomCode}/play`, { state: { room: data.room, user: data.user } });
    } catch (err) {
      setError(err.message || 'Failed to join');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!createName.trim() || !createUsername.trim()) {
      setError('Room name and your username required');
      return;
    }
    setLoading(true);
    try {
      const { data } = await client.post('/rooms', {
        name: createName.trim(),
        description: createDescription.trim(),
        visibility: createVisibility,
        password: createPassword || undefined,
        username: createUsername.trim(),
      });
      localStorage.setItem(LAST_ROOM_KEY, data.room.roomCode);
      localStorage.setItem(LAST_ROOM_NAME_KEY, data.room.name || '');
      setLastRoom({ code: data.room.roomCode, name: data.room.name || '' });
      navigate(`/room/${data.room.roomCode}/play`, { state: { room: data.room, user: data.user } });
    } catch (err) {
      setError(err.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleRejoin = () => {
    if (lastRoom.code) navigate(`/room/${lastRoom.code}`);
  };

  return (
    <div className={styles.home}>
      <div className={styles.hero}>
        <h1>Listen together in sync</h1>
        <p>Create or join a room, upload music, and enjoy real-time synchronized playback.</p>
      </div>

      <div className={styles.tabs}>
        <button
          type="button"
          className={mode === 'join' ? styles.tabActive : styles.tab}
          onClick={() => setMode('join')}
        >
          Join room
        </button>
        <button
          type="button"
          className={mode === 'create' ? styles.tabActive : styles.tab}
          onClick={() => setMode('create')}
        >
          Create room
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {lastRoom.code && (
        <div className={styles.rejoinSection}>
          <button type="button" className={styles.rejoinBtn} onClick={handleRejoin}>
            Rejoin {lastRoom.name || lastRoom.code}
          </button>
        </div>
      )}

      {mode === 'join' && (
        <form className={styles.card} onSubmit={handleJoin}>
          <h2>Join a room</h2>
          <label>
            Room code
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              maxLength={6}
              autoComplete="off"
            />
          </label>
          <label>
            Your username
            <input
              type="text"
              value={joinUsername}
              onChange={(e) => setJoinUsername(e.target.value)}
              placeholder="Your name"
              maxLength={30}
            />
          </label>
          <label>
            Password (if room is protected)
            <input
              type="password"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <button type="submit" className={styles.primaryBtn} disabled={loading}>
            {loading ? 'Joining…' : 'Join'}
          </button>
        </form>
      )}

      {mode === 'create' && (
        <form className={styles.card} onSubmit={handleCreate}>
          <h2>Create a room</h2>
          <label>
            Room name
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="My Music Room"
              maxLength={100}
            />
          </label>
          <label>
            Description (optional)
            <input
              type="text"
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="Chill vibes only"
              maxLength={500}
            />
          </label>
          <label>
            Your username
            <input
              type="text"
              value={createUsername}
              onChange={(e) => setCreateUsername(e.target.value)}
              placeholder="Host name"
              maxLength={30}
            />
          </label>
          <label>
            Visibility
            <select value={createVisibility} onChange={(e) => setCreateVisibility(e.target.value)}>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </label>
          <label>
            Password (optional, 4+ chars)
            <input
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              placeholder="Leave empty for no password"
            />
          </label>
          <button type="submit" className={styles.primaryBtn} disabled={loading}>
            {loading ? 'Creating…' : 'Create room'}
          </button>
        </form>
      )}

      {publicRooms.length > 0 && (
        <section className={styles.publicSection}>
          <h3>Public rooms</h3>
          <div className={styles.roomList}>
            {publicRooms.slice(0, 10).map((r) => (
              <button
                key={r._id}
                type="button"
                className={styles.roomCard}
                onClick={() => {
                  setJoinCode(r.roomCode);
                  setMode('join');
                }}
              >
                <span className={styles.roomName}>{r.name}</span>
                <span className={styles.roomMeta}>
                  {r.members?.length || 0} · {r.hostId?.username || 'Host'}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
