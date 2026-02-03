import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoom } from '../context/RoomContext';
import { useSocket } from '../context/SocketContext';
import { hasPermission, isHost } from '../utils/roles';
import client from '../api/client';
import styles from './Settings.module.css';

export default function Settings({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { room, user, leaveRoom, setRoom } = useRoom();
  const { getSocket } = useSocket();
  const [closing, setClosing] = useState(false);
  const [whoCanUpload, setWhoCanUpload] = useState(room?.whoCanUpload || 'host_cohost');
  const [savingUpload, setSavingUpload] = useState(false);

  const canCloseRoom = room && user && hasPermission(room, user._id, 'CLOSE_ROOM');
  const isHostUser = room && user && isHost(room, user._id);

  useEffect(() => {
    if (room?.whoCanUpload) setWhoCanUpload(room.whoCanUpload);
  }, [room?.whoCanUpload]);

  const handleLeave = async () => {
    if (!room?._id) return;
    await leaveRoom(room._id);
    onClose();
    navigate('/');
  };

  const handleCloseRoom = async () => {
    if (!canCloseRoom || !room?._id) return;
    setClosing(true);
    try {
      await client.post(`/rooms/${room._id}/close`, { userId: user._id });
      await leaveRoom(room._id);
      onClose();
      navigate('/');
    } catch (err) {
      console.error(err);
    } finally {
      setClosing(false);
    }
  };

  const handleWhoCanUploadChange = async (e) => {
    const value = e.target.value;
    if (!isHostUser || !room?._id || value === room.whoCanUpload) return;
    setSavingUpload(true);
    try {
      const { data } = await client.patch(`/rooms/${room._id}/settings`, {
        userId: user._id,
        whoCanUpload: value,
      });
      if (data.room) setRoom(data.room);
      setWhoCanUpload(value);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingUpload(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h3>Settings</h3>
        <div className={styles.section}>
          <p className={styles.meta}>
            Room: <strong>{room?.name}</strong>
          </p>
          <p className={styles.meta}>Code: {room?.roomCode}</p>
          <p className={styles.meta}>You: {user?.username}</p>
        </div>
        {isHostUser && (
          <div className={styles.section}>
            <label className={styles.settingLabel}>
              Who can add songs to the queue
              <select
                value={whoCanUpload}
                onChange={handleWhoCanUploadChange}
                disabled={savingUpload}
                className={styles.select}
              >
                <option value="host">Host only</option>
                <option value="host_cohost">Host & cohosts</option>
                <option value="all">Everyone in the room</option>
              </select>
            </label>
          </div>
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.leaveBtn} onClick={handleLeave}>
            Leave room
          </button>
          {canCloseRoom && (
            <button
              type="button"
              className={styles.closeRoomBtn}
              onClick={handleCloseRoom}
              disabled={closing}
            >
              {closing ? 'Closing…' : 'Close room'}
            </button>
          )}
        </div>
        <button type="button" className={styles.cancelBtn} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
