import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import styles from './Layout.module.css';

export default function Layout({ children }) {
  const { theme, toggleTheme } = useTheme();
  const { connected } = useSocket();

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          Music Room
        </Link>
        <nav className={styles.nav}>
          <Link to="/">Home</Link>
          <Link to="/admin">Admin</Link>
          <span className={styles.status} title={connected ? 'Connected' : 'Disconnected'}>
            <span className={connected ? styles.dotGreen : styles.dotRed} />
            {connected ? 'Live' : 'Offline'}
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            className={styles.themeBtn}
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : theme === 'light' ? '🌙' : '✨'}
          </button>
        </nav>
      </header>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
