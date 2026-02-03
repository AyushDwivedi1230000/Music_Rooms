/**
 * Server entry point - Express + Socket.io
 * Real-Time Collaborative Music Room Platform - Backend
 */

require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { setupSockets } = require('./sockets');

const app = express();
const server = http.createServer(app);

// Trust proxy (e.g. behind Cursor/VS Code tunnel or reverse proxy) so rate limiter works with X-Forwarded-For
app.set('trust proxy', 1);

// CORS - allow frontend origin
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
const origins = corsOrigin.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: origins.length ? origins : true,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API prefix
app.use('/api', routes);

// Health check for deployment (includes DB status for debugging)
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    ok: dbConnected,
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'connected' : 'disconnected',
  });
});

// Serve uploaded audio files (in production use CDN or separate static server)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use(errorHandler);

// Socket.io - attach to same HTTP server
const io = new Server(server, {
  cors: { origin: origins.length ? origins : '*', credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
});
app.set('io', io);
setupSockets(io);

// Connect DB and start server
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
