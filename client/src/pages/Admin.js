import React, { useState, useEffect } from 'react';
import client from '../api/client';
import styles from './Admin.module.css';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [popularRooms, setPopularRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    client
      .get('/admin/stats')
      .then(({ data }) => {
        setStats(data.stats);
        setPopularRooms(data.popularRooms || []);
      })
      .catch((err) => setError(err.message || 'Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.loading}>Loading analytics…</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!stats) return <div className={styles.error}>Admin dashboard is disabled.</div>;

  const maxRooms = Math.max(1, ...popularRooms.map((r) => r.members?.length || 0));

  return (
    <div className={styles.admin}>
      <h1>Analytics Dashboard</h1>
      <p className={styles.subtitle}>Overview of platform usage</p>

      <div className={styles.cards}>
        <div className={styles.card}>
          <span className={styles.label}>Total rooms</span>
          <span className={styles.value}>{stats.totalRooms}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.label}>Active rooms</span>
          <span className={styles.value}>{stats.activeRooms}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.label}>Total users</span>
          <span className={styles.value}>{stats.totalUsers}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.label}>Total songs</span>
          <span className={styles.value}>{stats.totalSongs}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.label}>Songs played</span>
          <span className={styles.value}>{stats.totalSongsPlayed ?? 0}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.label}>Session duration (min)</span>
          <span className={styles.value}>{stats.totalDurationMinutes ?? 0}</span>
        </div>
      </div>

      <section className={styles.section}>
        <h2>Most popular rooms (by members)</h2>
        <div className={styles.chart}>
          {popularRooms.length === 0 && (
            <p className={styles.noData}>No room data yet.</p>
          )}
          {popularRooms.map((r) => {
            const count = r.members?.length || 0;
            const pct = maxRooms > 0 ? (count / maxRooms) * 100 : 0;
            return (
              <div key={r._id} className={styles.barRow}>
                <span className={styles.barLabel} title={r.name}>
                  {r.name?.slice(0, 24)}
                  {r.name?.length > 24 ? '…' : ''}
                </span>
                <div className={styles.barWrap}>
                  <div
                    className={styles.bar}
                    style={{ width: `${pct}%` }}
                    title={`${count} members`}
                  />
                </div>
                <span className={styles.barValue}>{count}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
