import React, { useEffect } from 'react';
import { useRoom } from '../context/RoomContext';
import { useSocket } from '../context/SocketContext';
import { getMemberRole, isHost } from '../utils/roles';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const { room, user, members, setMembers } = useRoom();
  const { getSocket } = useSocket();

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !room?._id) return;

    const onJoined = (data) => {
      setMembers((prev) => {
        const next = [...prev];
        const exists = next.some(
          (m) => m.userId?._id?.toString() === data.userId || m.userId?.toString() === data.userId
        );
        if (!exists)
          next.push({
            userId: { _id: data.userId, username: data.username },
            role: 'listener',
          });
        return next;
      });
    };

    const onLeft = (data) => {
      setMembers((prev) =>
        prev.filter(
          (m) =>
            m.userId?._id?.toString() !== data.userId &&
            m.userId?.toString() !== data.userId
        )
      );
    };

    socket.on('user_joined', onJoined);
    socket.on('user_left', onLeft);
    return () => {
      socket.off('user_joined', onJoined);
      socket.off('user_left', onLeft);
    };
  }, [getSocket, room?._id, setMembers]);

  const displayMembers = members.length ? members : room?.members || [];

  return (
    <aside className={styles.sidebar}>
      <h3>In room</h3>
      <ul className={styles.list}>
        {displayMembers.map((m) => {
          const uid = m.userId?._id?.toString() || m.userId?.toString();
          const name = m.userId?.username || 'User';
          const role = m.role || getMemberRole(room, uid);
          const isYou = uid === user?._id?.toString();
          return (
            <li key={uid} className={styles.item}>
              <span className={styles.avatar}>
                {(name[0] || '?').toUpperCase()}
              </span>
              <span className={styles.name}>
                {name}
                {isYou && ' (you)'}
              </span>
              <span className={styles.role}>{role}</span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
