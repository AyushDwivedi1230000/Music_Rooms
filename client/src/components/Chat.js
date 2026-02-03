import React, { useState, useEffect, useRef } from 'react';
import { useRoom } from '../context/RoomContext';
import { useSocket } from '../context/SocketContext';
import styles from './Chat.module.css';

export default function Chat() {
  const { room, user, messages, setMessages } = useRoom();
  const { getSocket } = useSocket();
  const [input, setInput] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !room?._id) return;

    const onMsg = (msg) => {
      setMessages((prev) => [...prev.slice(-99), msg]);
    };

    const onUserJoined = (data) => {
      setMessages((prev) => [
        ...prev.slice(-99),
        { _id: `join-${Date.now()}`, isSystem: true, message: `${data.username} joined` },
      ]);
    };

    const onUserLeft = (data) => {
      setMessages((prev) => [
        ...prev.slice(-99),
        { _id: `leave-${Date.now()}`, isSystem: true, message: `${data.username} left` },
      ]);
    };

    socket.on('chat_message', onMsg);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    return () => {
      socket.off('chat_message', onMsg);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
    };
  }, [getSocket, room?._id, setMessages]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    const trimmed = input.trim().slice(0, 1000);
    if (!trimmed || !user?.username) return;

    const socket = getSocket();
    if (socket && room?._id) {
      socket.emit(
        'chat_message',
        {
          roomId: room._id,
          userId: user._id,
          username: user.username,
          message: trimmed,
        },
        (res) => {
          if (res?.error) console.error(res.error);
          else setInput('');
        }
      );
    }
  };

  return (
    <div className={styles.chat}>
      <h3>Chat</h3>
      <ul ref={listRef} className={styles.list}>
        {messages.map((m) => (
          <li
            key={m._id || m.createdAt + m.message}
            className={m.isSystem ? styles.system : styles.message}
          >
            {m.isSystem ? (
              <span className={styles.systemText}>{m.message}</span>
            ) : (
              <>
                <span className={styles.name}>{m.username}:</span>
                <span className={styles.body}>{m.message}</span>
              </>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={send} className={styles.form}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          maxLength={1000}
          className={styles.input}
        />
        <button type="submit" className={styles.send}>
          Send
        </button>
      </form>
    </div>
  );
}
