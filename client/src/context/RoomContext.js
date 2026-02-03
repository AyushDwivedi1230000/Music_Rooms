import React, { createContext, useContext, useState, useCallback } from 'react';
import client from '../api/client';
import { useSocket } from './SocketContext';

const RoomContext = createContext();

export function RoomProvider({ children }) {
  const [room, setRoom] = useState(null);
  const [user, setUser] = useState(null);
  const [queue, setQueue] = useState([]);
  const [playback, setPlayback] = useState({
    currentSong: null,
    currentTime: 0,
    isPlaying: false,
    lastUpdated: null,
  });
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const { getSocket } = useSocket();

  const loadRoomState = useCallback(async (roomId) => {
    try {
      const { data } = await client.get(`/rooms/${roomId}/state`);
      setQueue(data.queue || []);
      setMembers(data.members || []);
      setPlayback({
        currentSong: data.currentSongId || null,
        currentTime: data.currentTime ?? 0,
        isPlaying: data.isPlaying ?? false,
        lastUpdated: data.lastUpdated,
      });
      return data;
    } catch (err) {
      throw err;
    }
  }, []);

  const joinRoom = useCallback(async (roomCode, password, username) => {
    const { data } = await client.post('/rooms/join', {
      roomCode: roomCode.toUpperCase(),
      password: password || undefined,
      username: username.trim(),
    });
    setRoom(data.room);
    setUser(data.user);
    setMembers(data.room.members || []);
    setQueue([]);
    setPlayback({
      currentSong: data.room.currentSongId || null,
      currentTime: data.room.currentTime ?? 0,
      isPlaying: data.room.isPlaying ?? false,
      lastUpdated: data.room.lastUpdated,
    });
    return data;
  }, []);

  const createRoom = useCallback(async (options) => {
    const { data } = await client.post('/rooms', {
      name: options.name,
      description: options.description,
      visibility: options.visibility || 'public',
      password: options.password || undefined,
      username: options.username.trim(),
    });
    setRoom(data.room);
    setUser(data.user);
    setMembers(data.room.members || []);
    setQueue([]);
    setPlayback({
      currentSong: null,
      currentTime: 0,
      isPlaying: false,
      lastUpdated: null,
    });
    return data;
  }, []);

  const leaveRoom = useCallback(async (roomId) => {
    await client.post(`/rooms/${roomId}/leave`, { userId: user?._id });
    const socket = getSocket();
    if (socket) socket.emit('leave_room', { roomId, userId: user?._id, username: user?.username });
    setRoom(null);
    setUser(null);
    setQueue([]);
    setMessages([]);
    setMembers([]);
    setPlayback({ currentSong: null, currentTime: 0, isPlaying: false, lastUpdated: null });
  }, [user, getSocket]);

  const value = {
    room,
    user,
    queue,
    setQueue,
    playback,
    setPlayback,
    messages,
    setMessages,
    members,
    setMembers,
    loadRoomState,
    joinRoom,
    createRoom,
    leaveRoom,
    setRoom,
    setUser,
  };

  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be used within RoomProvider');
  return ctx;
}
