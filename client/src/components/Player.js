import React, { useRef, useEffect, useCallback } from 'react';
import { useRoom } from '../context/RoomContext';
import { useSocket } from '../context/SocketContext';
import styles from './Player.module.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

export default function Player() {
  const audioRef = useRef(null);
  const { room, user, playback, setPlayback, queue } = useRoom();
  const { getSocket } = useSocket();

  const roomId = room?._id;
  const currentSong = playback.currentSong;
  const isPlaying = playback.isPlaying;
  const currentTime = playback.currentTime;

  const emitPlayback = useCallback(
    (time, playing) => {
      const socket = getSocket();
      if (socket && roomId && user?._id) {
        socket.emit('playback_state', {
          roomId,
          userId: user._id,
          currentTime: time,
          isPlaying: playing,
        });
      }
    },
    [getSocket, roomId, user]
  );

  const emitSeek = useCallback(
    (time) => {
      const socket = getSocket();
      if (socket && roomId && user?._id) {
        socket.emit('seek', { roomId, userId: user._id, currentTime: time });
      }
    },
    [getSocket, roomId, user]
  );

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !roomId) return;

    const onSync = (data) => {
      setPlayback((p) => ({
        ...p,
        currentTime: data.currentTime ?? p.currentTime,
        isPlaying: data.isPlaying ?? p.isPlaying,
        lastUpdated: data.lastUpdated,
      }));
    };

    const onSeek = (data) => {
      setPlayback((p) => ({ ...p, currentTime: data.currentTime, lastUpdated: data.lastUpdated }));
      if (audioRef.current) audioRef.current.currentTime = data.currentTime;
    };

    const onQueueUpdated = (data) => {
      setPlayback((p) => ({
        ...p,
        currentSong: data.currentSong ?? p.currentSong,
        currentTime: data.currentTime ?? 0,
        isPlaying: data.isPlaying ?? p.isPlaying,
        lastUpdated: data.lastUpdated,
      }));
      if (audioRef.current) {
        audioRef.current.currentTime = data.currentTime ?? 0;
        if (data.isPlaying) audioRef.current.play().catch(() => {});
        else audioRef.current.pause();
      }
    };

    socket.on('playback_sync', onSync);
    socket.on('seek_sync', onSeek);
    socket.on('queue_updated', onQueueUpdated);
    return () => {
      socket.off('playback_sync', onSync);
      socket.off('seek_sync', onSeek);
      socket.off('queue_updated', onQueueUpdated);
    };
  }, [getSocket, roomId, setPlayback]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = currentTime;
  }, [currentSong?._id]);

  const togglePlay = () => {
    const next = !isPlaying;
    const time = audioRef.current?.currentTime ?? currentTime;
    setPlayback((p) => ({ ...p, isPlaying: next, currentTime: time }));
    emitPlayback(time, next);
    if (audioRef.current) {
      if (next) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
    }
  };

  const handleTimeUpdate = () => {
    const t = audioRef.current?.currentTime ?? 0;
    setPlayback((p) => ({ ...p, currentTime: t }));
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setPlayback((p) => ({ ...p, currentTime: time }));
    if (audioRef.current) audioRef.current.currentTime = time;
    emitSeek(time);
  };

  const handleEnded = () => {
    const socket = getSocket();
    if (socket && roomId && user?._id) socket.emit('skip', { roomId, userId: user._id });
  };

  const handleKeyDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlay();
    }
    if (e.code === 'KeyN') {
      e.preventDefault();
      const socket = getSocket();
      if (socket && roomId && user?._id) socket.emit('skip', { roomId, userId: user._id });
    }
    if (e.code === 'KeyM') {
      e.preventDefault();
      if (audioRef.current) audioRef.current.muted = !audioRef.current.muted;
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [roomId, user, isPlaying]);

  const src = currentSong?.filePath
    ? `${API_BASE}/${currentSong.filePath.replace(/\\/g, '/')}`
    : '';

  const duration = currentSong?.duration ?? 0;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={styles.player}>
      {currentSong && (
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onPlay={() => setPlayback((p) => ({ ...p, isPlaying: true }))}
          onPause={() => setPlayback((p) => ({ ...p, isPlaying: false }))}
          onLoadedMetadata={(e) => {
            const d = e.target.duration;
            if (d && !currentSong.duration) setPlayback((p) => ({ ...p, duration: d }));
          }}
          crossOrigin="anonymous"
        />
      )}

      <div className={styles.info}>
        {currentSong ? (
          <>
            <span className={styles.title}>{currentSong.title}</span>
            <span className={styles.artist}>{currentSong.artist || 'Unknown'}</span>
          </>
        ) : (
          <span className={styles.empty}>No song playing</span>
        )}
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.playBtn}
          onClick={togglePlay}
          disabled={!currentSong}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <div className={styles.progressWrap}>
          <span className={styles.time}>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className={styles.slider}
          />
          <span className={styles.time}>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
