# Real-Time Collaborative Music Room Platform

A production-ready MERN stack web application where multiple users can join virtual music rooms and listen to uploaded music together in real-time. Each room acts as a synchronized shared music player.

## Quick Start

1. **Prerequisites**: Node.js 18+, MongoDB (local or [Atlas](https://www.mongodb.com/atlas)).
2. **Install**: From project root run `npm run install:all` (or `npm install` then `cd client && npm install` then `cd ../server && npm install`).
3. **Environment**: Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` (e.g. `mongodb://localhost:27017/music-room`).
4. **Run**: `npm run dev` (starts backend on port 5000 and frontend on port 3000).
5. Open http://localhost:3000 → Create room → Upload a song → Play. Join from another browser with the room code.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [ER Diagram](#er-diagram)
- [API Documentation](#api-documentation)
- [Setup Instructions](#setup-instructions)
- [Deployment](#deployment)
- [Screenshots](#screenshots)
- [License](#license)

---

## Project Overview

The platform allows users to:

- **Create** or **join** rooms with a unique 6-character code
- **Upload** audio files (MP3, WAV, OGG) and manage a shared queue
- **Listen in sync** – play, pause, seek, and skip are synchronized for everyone in the room
- **Chat** in real time with room members
- **Roles**: Host, Co-host, and Listener with enforced permissions

---

## Features

### 1. User System

- Join with username (guest mode)
- Optional profile image
- Online/offline status
- Active users shown in room sidebar

### 2. Room System

- Create room with name, description, visibility (public/private)
- Unique 6-character room code
- Optional password protection
- Room dashboard before joining: host, members, current song, privacy

### 3. Role & Permission System

| Role     | Upload | Remove song | Skip | Reorder | Promote | Kick | Close room |
|----------|--------|-------------|------|---------|----------|------|------------|
| Host     | ✓      | ✓           | ✓    | ✓       | ✓        | ✓    | ✓          |
| Co-host  | ✓      | —           | ✓    | ✓       | —        | —    | —          |
| Listener | —      | —           | —    | —       | —        | —    | —          |

### 4. Real-Time Sync (Socket.io)

- Play / Pause sync
- Seek sync
- Queue updates
- User join / leave
- Reconnection handling
- Playback state stored in DB: `currentSong`, `currentTime`, `isPlaying`, `lastUpdated`

### 5. File Upload

- Audio only: MP3, WAV, OGG (max 10MB)
- MIME validation
- Upload progress indicator
- Metadata: title, duration, artist
- Upload cooldown and per-user limit to prevent spam

### 6. Queue & Voting

- Add, remove, reorder (by host/co-host)
- Like/Dislike per song
- Auto-skip on vote threshold (configurable)

### 7. Chat

- Real-time room chat
- Emoji support
- System messages (join/leave)

### 8. UI/UX

- Dark theme (default), optional Light and Neon
- Glassmorphism cards, responsive layout
- Sidebar (users), main player, queue panel, upload modal, settings
- **Keyboard shortcuts**: Space = Play/Pause, N = Next, M = Mute

### 9. Admin Dashboard

- Route: `/admin`
- Total rooms, active users, songs played, session duration
- Most popular rooms (chart)

### 10. Security

- Input validation (express-validator)
- Rate limiting
- File sanitization (MIME, size)
- Optional JWT auth, password hashing (bcrypt)
- Role verification middleware

---

## Tech Stack

- **Frontend**: React 18, React Router, Socket.io-client, Axios
- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB with Mongoose
- **Uploads**: Multer
- **Auth**: Optional JWT, bcrypt

No Firebase, Supabase, or Next.js.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │   Home   │  │ Room     │  │  Room    │  │ Admin Dashboard  │  │
│  │ Create/  │  │ Dashboard│  │  Player  │  │ /admin           │  │
│  │ Join     │  │ /room/:  │  │ Queue    │  └──────────────────┘  │
│  └──────────┘  │ code     │  │ Chat     │                        │
│                └──────────┘  │ Sidebar  │     ThemeProvider       │
│                              └──────────┘     SocketProvider     │
│                                    │           RoomProvider       │
│                                    ▼                             │
│                         Socket.io-client ◄──► REST API (axios)   │
└─────────────────────────────────────│───────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVER (Node.js + Express)                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Routes → Controllers → Services → Models                      ││
│  │ /api/rooms, /api/rooms/:id/upload, /api/admin/stats           ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Socket.io: join_room, playback_state, seek, skip, chat_message││
│  │ queue_list, queue_reorder, remove_song, song_vote, etc.      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                    │                             │
│                                    ▼                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ MongoDB (Mongoose): User, Room, Song, ChatMessage,            ││
│  │ RoomSession, UploadCooldown                                  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## ER Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │       │    Room     │       │    Song      │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ _id         │◄──────│ hostId      │       │ _id         │
│ username    │       │ roomCode    │◄──────│ roomId      │
│ profileImage│       │ members[]   │       │ uploadedBy  │
│ isGuest     │       │ currentSongId│─────►│ title,artist│
│ socketId    │       │ currentTime │       │ duration    │
│ currentRoomId│      │ isPlaying   │       │ order       │
└─────────────┘       │ visibility  │       │ likes/dislikes│
                      │ passwordHash│       └─────────────┘
                      └──────┬──────┘
                             │
                             │ 1:N
                             ▼
                      ┌─────────────┐       ┌─────────────┐
                      │ ChatMessage │       │ RoomSession │
                      ├─────────────┤       ├─────────────┤
                      │ roomId      │       │ roomId      │
                      │ userId      │       │ peakUsers   │
                      │ message     │       │ totalSongs  │
                      │ isSystem    │       │ durationMin │
                      └─────────────┘       └─────────────┘
```

---

## API Documentation

Base URL: `/api` (or `https://your-backend/api`)

### Rooms

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | /rooms   | Create room (body: name, description?, visibility?, password?, username) |
| POST   | /rooms/join | Join room (body: roomCode, password?, username) |
| GET    | /rooms/code/:roomCode | Get room info (dashboard) |
| GET    | /rooms   | List public rooms |
| GET    | /rooms/:roomId/state | Full room state + queue |
| POST   | /rooms/:roomId/leave | Leave room (body: userId) |
| POST   | /rooms/:roomId/close | Close room – host only (body: userId) |

### Upload

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | /rooms/:roomId/upload | Upload audio (multipart: audio file, userId, title?, artist?) |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /admin/stats | Analytics (total rooms, users, songs, popular rooms) |

### Socket.io Events (client → server)

- `join_room` – { roomId, userId, username }
- `leave_room` – { roomId, userId, username? }
- `playback_state` – { roomId, userId, currentTime, isPlaying }
- `seek` – { roomId, userId, currentTime }
- `skip` – { roomId, userId }
- `vote_skip` – { roomId, userId }
- `chat_message` – { roomId, userId, username, message }
- `queue_reorder` – { roomId, userId, songIds[] }
- `remove_song` – { roomId, userId, songId }
- `song_vote` – { roomId, songId, userId, vote: 1 | -1 }
- `promote_user` – { roomId, userId, targetUserId, role }
- `kick_user` – { roomId, userId, targetUserId }

### Socket.io Events (server → client)

- `playback_sync`, `seek_sync`, `queue_updated`, `queue_list`
- `chat_message`, `user_joined`, `user_left`
- `song_vote_updated`, `member_role_updated`, `kicked_from_room`

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### 1. Clone and install

```bash
git clone <repo-url>
cd music-room-platform
npm run install:all
```

Or manually:

```bash
npm install
cd client && npm install
cd ../server && npm install
```

### 2. Environment

**Server** (`server/.env`):

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/music-room
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000
ADMIN_ENABLED=true
```

**Client** (optional for dev): leave `REACT_APP_API_URL` unset so the dev server proxy is used.

### 3. Run

**Development (concurrent client + server):**

```bash
npm run dev
```

- Frontend: http://localhost:3000  
- Backend: http://localhost:5000  
- Socket.io: http://localhost:5000  

**Or run separately:**

```bash
# Terminal 1 – server
npm run server

# Terminal 2 – client
npm run client
```

### 4. Create a room

1. Open http://localhost:3000
2. Click “Create room”, enter name and username
3. Upload a song (Upload button), then play
4. Open another browser/incognito, join with the room code

---

## Deployment

### Frontend (Vercel)

1. Push client to Vercel or link repo; set root to repo root.
2. **Build settings**:  
   - Build command: `cd client && npm install && npm run build`  
   - Output directory: `client/build`
3. **Environment**: `REACT_APP_API_URL` = your backend URL (e.g. `https://music-room-api.onrender.com`).
4. If API is on another domain, configure rewrites in `vercel.json` or use the same origin.

### Backend (Render / Railway)

1. New Web Service; connect repo.
2. **Build**: `cd server && npm install`  
3. **Start**: `cd server && npm start`
4. **Env**: `MONGODB_URI` (Atlas), `JWT_SECRET`, `CORS_ORIGIN` (Vercel URL), `ADMIN_ENABLED=true`, `NODE_ENV=production`, `PORT` (if required).

### MongoDB Atlas

1. Create cluster, get connection string.
2. Set `MONGODB_URI` in backend env.
3. Allow backend IP (or 0.0.0.0/0 for Render/Railway).

### Production checklist

- Strong `JWT_SECRET`
- `CORS_ORIGIN` = exact frontend URL(s)
- `ADMIN_ENABLED` as needed
- Serve uploads via CDN or static route (e.g. `/uploads`)

---

## Screenshots

<!-- Add screenshots here, e.g. -->
<!-- ![Home](docs/screenshots/home.png) -->
<!-- ![Room](docs/screenshots/room.png) -->
<!-- ![Admin](docs/screenshots/admin.png) -->

Placeholder: Home (create/join), Room (player + queue + chat), Admin dashboard.

---

## License

MIT (or your chosen license).

---

## Code Quality

- Modular structure (MVC on backend, components + context on frontend)
- Async/await, error handling, validation
- Comments and constants (no hardcoding)
- Scalable layout for more rooms and features
