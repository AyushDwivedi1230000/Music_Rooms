import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

const getSocketUrl = () => {
  const url = process.env.REACT_APP_API_URL || window.location.origin;
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}:${u.port || (u.protocol === 'https:' ? 443 : 5000)}`;
  } catch {
    return 'http://localhost:5000';
  }
};

export function SocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const origin = window.location.origin;
    const apiUrl = process.env.REACT_APP_API_URL;
    const socketUrl = apiUrl
      ? apiUrl.replace(/\/$/, '')
      : origin.includes('localhost')
        ? 'http://localhost:5000'
        : origin;
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socketRef.current = socket;
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const value = {
    socket: socketRef.current,
    connected,
    getSocket: () => socketRef.current,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
