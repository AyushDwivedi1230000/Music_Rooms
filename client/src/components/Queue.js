import React, { useEffect } from 'react';
import { useRoom } from '../context/RoomContext';
import { useSocket } from '../context/SocketContext';
import { getMemberRole, hasPermission } from '../utils/roles';
import styles from './Queue.module.css';

export default function Queue() {
  const { room, user, queue, setQueue, playback } = useRoom();
  const { getSocket } = useSocket();
  const currentSongId = playback.currentSong?._id?.toString();

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !room?._id) return;

    const onList = (data) => {
      setQueue(data.queue || []);
    };

    socket.on('queue_list', onList);
    return () => socket.off('queue_list', onList);
  }, [getSocket, room?._id, setQueue]);

  const canReorder = room && user && hasPermission(room, user._id, 'REORDER_QUEUE');
  const canRemove = room && user && hasPermission(room, user._id, 'REMOVE_SONG');

  const handleRemove = (songId) => {
    const socket = getSocket();
    if (!socket || !room?._id || !user?._id || !canRemove) return;
    socket.emit('remove_song', { roomId: room._id, userId: user._id, songId }, (res) => {
      if (res?.error) console.error(res.error);
    });
  };

  const handleVote = (songId, vote) => {
    const socket = getSocket();
    if (!socket || !room?._id || !user?._id) return;
    socket.emit('song_vote', { roomId: room._id, songId, userId: user._id, vote }, (res) => {
      if (res?.error) console.error(res.error);
    });
  };

  return (
    <div className={styles.queue}>
      <h3>Queue</h3>
      <ul className={styles.list}>
        {queue.length === 0 && <li className={styles.empty}>Queue is empty</li>}
        {queue.map((song) => {
          const isCurrent = song._id?.toString() === currentSongId;
          return (
            <li
              key={song._id}
              className={`${styles.item} ${isCurrent ? styles.current : ''}`}
            >
              <span className={styles.order}>{queue.indexOf(song) + 1}</span>
              <div className={styles.details}>
                <span className={styles.title}>{song.title}</span>
                <span className={styles.meta}>
                  {song.artist || 'Unknown'} · {formatDuration(song.duration)}
                </span>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.voteBtn}
                  onClick={() => handleVote(song._id, 1)}
                  title="Like"
                >
                  👍 {song.likes || 0}
                </button>
                <button
                  type="button"
                  className={styles.voteBtn}
                  onClick={() => handleVote(song._id, -1)}
                  title="Dislike"
                >
                  👎 {song.dislikes || 0}
                </button>
                {canRemove && (
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => handleRemove(song._id)}
                    title="Remove"
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatDuration(sec) {
  if (!sec) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
