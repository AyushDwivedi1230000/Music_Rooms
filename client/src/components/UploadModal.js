import React, { useState, useRef } from 'react';
import client from '../api/client';
import { useRoom } from '../context/RoomContext';
import { hasPermission } from '../utils/roles';
import styles from './UploadModal.module.css';

export default function UploadModal({ isOpen, onClose }) {
  const { room, user, setQueue } = useRoom();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const canUpload = room && user && hasPermission(room, user._id, 'UPLOAD');

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
    if (!allowed.includes(f.type)) {
      setError('Only MP3, WAV, OGG allowed');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('Max file size 10MB');
      return;
    }
    setError('');
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !room?._id || !user?._id || !canUpload) return;

    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('userId', user._id);
    formData.append('title', title.trim() || file.name);
    formData.append('artist', artist.trim() || 'Unknown Artist');

    try {
      const res = await client.post(`/rooms/${room._id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (p) => {
          setProgress(p.loaded && p.total ? Math.round((p.loaded / p.total) * 100) : 0);
        },
      });

      if (res.data?.song) {
        setQueue((prev) => [...prev, res.data.song]);
      }
      onClose();
      setFile(null);
      setTitle('');
      setArtist('');
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Upload song</h3>
        {!canUpload && (
          <p className={styles.noPerm}>You don&apos;t have permission to upload.</p>
        )}
        {canUpload && (
          <form onSubmit={handleSubmit}>
            <label>
              Audio file (MP3, WAV, OGG, max 10MB)
              <input
                ref={inputRef}
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm"
                onChange={handleFileChange}
                className={styles.fileInput}
              />
              {file && <span className={styles.fileName}>{file.name}</span>}
            </label>
            <label>
              Title
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Song title"
              />
            </label>
            <label>
              Artist
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Artist"
              />
            </label>
            {uploading && (
              <div className={styles.progressWrap}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                </div>
                <span>{progress}%</span>
              </div>
            )}
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.actions}>
              <button type="button" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" disabled={!file || uploading}>
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
