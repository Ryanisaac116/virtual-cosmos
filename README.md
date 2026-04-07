# Virtual Cosmos

Virtual Cosmos is a real-time multiplayer workspace app built as a monorepo with:

- a Spring Boot backend for REST APIs, WebSocket/STOMP messaging, and MongoDB persistence
- a React + Vite frontend for the interactive world, join flow, theme system, and proximity chat

## Repository Structure

```text
virtual-cosmos/
|-- backend/
|   |-- src/main/java/...          # Controllers, services, websocket handlers, DTOs, models
|   |-- src/main/resources/        # Spring configuration
|   |-- src/test/java/...          # Backend tests
|   |-- pom.xml
|   |-- mvnw
|   `-- mvnw.cmd
|-- frontend/
|   |-- src/                       # React app source
|   |-- public/
|   |-- package.json
|   `-- vite.config.js
|-- .gitignore
|-- .gitattributes
`-- README.md
```

## Architecture

- MongoDB stores durable user and chat history data
- Spring Boot keeps active multiplayer session state in memory
- Players join through REST, then exchange live updates through STOMP over SockJS
- The frontend uses a PixiJS canvas for the world and React for UI
- The world is bounded to a fixed playable area, and both frontend and backend clamp movement to stay inside it
- Proximity chat appears only when another player is within the configured distance threshold
- Presence is protected by explicit leave requests, websocket disconnect handling, frontend heartbeats, and backend stale-session cleanup

## Current Features

- username join flow with persistent user lookup
- real-time player movement and broadcasted positions
- bounded world movement with server-side and client-side clamping
- visible proximity radius in the world
- proximity-triggered 1:1 chat
- persisted chat history per room
- dark and light theme support
- redesigned join screen and chat UI
- stale connection cleanup on both frontend and backend

## Implementation Overview

### High-level flow

1. A user joins through `POST /api/users/join`
2. The backend creates or reuses the MongoDB user record, assigns a spawn point, and adds an in-memory realtime session
3. The frontend opens a STOMP-over-SockJS connection to `/ws` and sends the `userId` in the connect headers
4. Movement updates are sent to `/app/move`
5. The backend updates in-memory positions, recalculates proximity, and broadcasts fresh state
6. When two users are near each other, the frontend subscribes to their deterministic chat room and renders the chat panel
7. Chat messages are sent to `/app/chat`, persisted to MongoDB, then rebroadcast to `/topic/chat/{roomId}`

### Backend implementation map

- `backend/src/main/java/com/ryan/virtual_cosmos/controller/UserController.java`
  Handles join, leave, and the debug active-user endpoint
- `backend/src/main/java/com/ryan/virtual_cosmos/controller/ChatController.java`
  Returns chat history for a room
- `backend/src/main/java/com/ryan/virtual_cosmos/service/UserSessionService.java`
  Owns in-memory active sessions, positions, session ids, and last activity timestamps
- `backend/src/main/java/com/ryan/virtual_cosmos/config/WorldBounds.java`
  Shared backend world size and clamp rules for spawn and movement limits
- `backend/src/main/java/com/ryan/virtual_cosmos/service/ProximityService.java`
  Computes Euclidean distance and proximity enter/leave transitions
- `backend/src/main/java/com/ryan/virtual_cosmos/service/SessionCleanupService.java`
  Centralizes explicit leave, websocket disconnect cleanup, and stale-session cleanup
- `backend/src/main/java/com/ryan/virtual_cosmos/service/StaleSessionCleanupService.java`
  Scheduled sweeper for inactive sessions
- `backend/src/main/java/com/ryan/virtual_cosmos/websocket/MovementHandler.java`
  Validates the current STOMP session, updates position, triggers proximity checks, and broadcasts positions
- `backend/src/main/java/com/ryan/virtual_cosmos/websocket/ChatHandler.java`
  Validates the sender session, stores chat, and broadcasts chat messages
- `backend/src/main/java/com/ryan/virtual_cosmos/websocket/HeartbeatHandler.java`
  Refreshes session liveness
- `backend/src/main/java/com/ryan/virtual_cosmos/websocket/WebSocketEventListener.java`
  Associates session ids on connect and cleans sessions up on disconnect

### Frontend implementation map

- `frontend/src/components/JoinScreen.jsx`
  Join form and initial user creation flow
- `frontend/src/store/GameContext.jsx`
  Shared app state for current user, players, nearby users, chat rooms, and messages
- `frontend/src/hooks/useWebSocket.js`
  Connection lifecycle, subscriptions, heartbeats, movement publish, chat publish, and proximity-based room switching
- `frontend/src/websocket/stompClient.js`
  Singleton STOMP client and current session tracking
- `frontend/src/canvas/GameCanvas.jsx`
  PixiJS world rendering, local movement, interpolation, visible proximity radius, and world-boundary enforcement
- `frontend/src/components/ChatPanel.jsx`
  Distance-driven chat panel UI, room resolution, and chat history loading
- `frontend/src/lib/proximity.js`
  Shared frontend distance helpers for chat visibility and partner selection

### Frontend state and UI notes

- `currentUser`
  The joined user returned by `POST /api/users/join`
- `players`
  Current realtime players from `/topic/positions`
- `nearbyUsers`
  Nearby user ids for the current user
- `activeChatRoom`
  The currently subscribed deterministic chat room
- `chatMessages`
  Cached chat history by room
- `localPosition`
  Immediate local movement state used before remote broadcasts catch up

Frontend UI highlights:

- dark and light themes are supported across the app and persisted locally
- the join flow is implemented as a dedicated landing-style entry screen
- the world is rendered in PixiJS while React handles shell UI, chat, and theming
- the playable area has a visible frame so the world edge feels intentional
- the chat panel is only shown when a nearby partner is resolved
- disconnects clear stale player, proximity, and active-room state from the UI

### Realtime behavior details

- Active player state is stored in memory on the backend for low-latency updates
- Durable user identity and chat history are stored in MongoDB
- Movement is clamped on both frontend and backend so players cannot leave the world bounds
- Room ids are deterministic: the two user ids are sorted and joined with `_`
- The frontend uses a small exit buffer beyond the visible proximity radius so chat does not flicker when users hover near the edge
- STOMP session validation is used for movement, chat, and heartbeat messages so an old socket cannot keep mutating state after a reconnect
- Frontend heartbeats plus backend scheduled cleanup protect against stale zombie sessions

### Frontend request usage

The frontend currently uses:

- REST:
  - `POST /api/users/join`
  - `DELETE /api/users/leave/{userId}?sessionId=...`
  - `GET /api/chat/{roomId}`
- STOMP publish:
  - `/app/move`
  - `/app/chat`
  - `/app/heartbeat`
- STOMP subscribe:
  - `/topic/positions`
  - `/topic/proximity`
  - `/topic/chat/{roomId}`

## API Reference

### REST API

#### `POST /api/users/join`

Create or resume a user session and return spawn data.

Request body:

```json
{
  "username": "ryan",
  "avatarColor": "#6366f1"
}
```

Successful response:

```json
{
  "userId": "69d294b0e40e77af811732c3",
  "username": "ryan",
  "avatarColor": "#6366f1",
  "spawnX": 328.12,
  "spawnY": 340.47
}
```

#### `GET /api/users/active`

Debug endpoint that returns currently active in-memory sessions.

Typical response shape:

```json
[
  {
    "userId": "69d294b0e40e77af811732c3",
    "username": "ryan",
    "avatarColor": "#6366f1",
    "x": 328.12,
    "y": 340.47,
    "sessionId": "abc123",
    "lastActivityAt": "2026-04-07T10:41:18.123Z",
    "nearbyUsers": ["69d2af7ce40e77af811732df"]
  }
]
```

#### `DELETE /api/users/leave/{userId}`

Explicitly removes the active user session.

Optional query parameter:

- `sessionId`
  When provided, the backend only removes the session if that `sessionId` still matches the current active socket for the user. This helps prevent an older tab from deleting a newer active connection.

Example:

```text
DELETE /api/users/leave/69d294b0e40e77af811732c3?sessionId=abc123
```

Response:

- `204 No Content`

#### `GET /api/chat/{roomId}`

Returns stored chat history for a room in chronological order.

Example:

```text
GET /api/chat/69d294b0e40e77af811732c3_69d2af7ce40e77af811732df
```

Response:

```json
[
  {
    "id": "67f3...",
    "senderId": "69d294b0e40e77af811732c3",
    "senderUsername": "ryan",
    "roomId": "69d294b0e40e77af811732c3_69d2af7ce40e77af811732df",
    "content": "hey",
    "timestamp": "2026-04-07T09:15:21.000Z"
  }
]
```

### WebSocket / STOMP API

#### Endpoint

- SockJS endpoint: `/ws`
- STOMP app destination prefix: `/app`
- STOMP broker topic prefix: `/topic`

#### Connect headers

The frontend sends the user id in the STOMP connect headers:

```json
{
  "userId": "69d294b0e40e77af811732c3"
}
```

#### Client publish destinations

##### `SEND /app/move`

Payload:

```json
{
  "userId": "69d294b0e40e77af811732c3",
  "x": 412.4,
  "y": 219.8
}
```

Behavior:

- validates the current STOMP session for that user
- clamps the position to world bounds and updates the in-memory position
- recalculates proximity
- broadcasts `/topic/positions`

##### `SEND /app/chat`

Payload:

```json
{
  "senderId": "69d294b0e40e77af811732c3",
  "senderUsername": "ryan",
  "roomId": "69d294b0e40e77af811732c3_69d2af7ce40e77af811732df",
  "content": "hello"
}
```

Behavior:

- validates the sender session
- assigns a timestamp if needed
- stores the message in MongoDB
- broadcasts `/topic/chat/{roomId}`

##### `SEND /app/heartbeat`

Payload:

```json
{
  "userId": "69d294b0e40e77af811732c3"
}
```

Behavior:

- refreshes `lastActivityAt` for the current session
- helps the backend remove only truly stale connections

#### Client subscriptions

##### `SUBSCRIBE /topic/positions`

Broadcast payload:

```json
[
  {
    "userId": "69d294b0e40e77af811732c3",
    "username": "ryan",
    "avatarColor": "#6366f1",
    "x": 412.4,
    "y": 219.8,
    "nearbyUsers": ["69d2af7ce40e77af811732df"]
  }
]
```

##### `SUBSCRIBE /topic/proximity`

Broadcast payload:

```json
{
  "userId": "69d294b0e40e77af811732c3",
  "nearbyUsers": ["69d2af7ce40e77af811732df"]
}
```

The frontend filters these updates so each client only applies its own proximity payload.

##### `SUBSCRIBE /topic/chat/{roomId}`

Broadcast payload:

```json
{
  "senderId": "69d294b0e40e77af811732c3",
  "senderUsername": "ryan",
  "roomId": "69d294b0e40e77af811732c3_69d2af7ce40e77af811732df",
  "content": "hello",
  "timestamp": "2026-04-07T09:15:21.000Z"
}
```

## Prerequisites

Install these before running the app:

- Java 21 or newer
- Node.js 20 or newer
- npm
- MongoDB running locally or a reachable MongoDB URI

## Environment Variables

The backend is now deploy-ready for different environments through environment variables.

| Variable | Default | Purpose |
|---|---|---|
| `SERVER_PORT` | `8080` | Backend HTTP port |
| `MONGODB_URI` | `mongodb://localhost:27017/virtual_cosmos` | MongoDB connection string |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Allowed origin patterns for REST and WebSocket access |
| `APP_PRESENCE_STALE_SESSION_TIMEOUT_MS` | `60000` | How long an inactive realtime session can live before cleanup |
| `APP_PRESENCE_STALE_SESSION_SWEEP_MS` | `15000` | How often the backend checks for stale realtime sessions |

Notes:

- `CORS_ALLOWED_ORIGINS` can be a comma-separated list
- the frontend currently uses relative `/api` and `/ws` paths, which works well behind one shared domain or a reverse proxy

## How To Run Locally

### 1. Start MongoDB

Make sure MongoDB is available before starting the backend.

If you use a local MongoDB installation, the default URI already matches:

```text
mongodb://localhost:27017/virtual_cosmos
```

If you use another MongoDB instance, export `MONGODB_URI` first.

Windows PowerShell:

```powershell
$env:MONGODB_URI="mongodb://localhost:27017/virtual_cosmos"
```

macOS / Linux:

```bash
export MONGODB_URI="mongodb://localhost:27017/virtual_cosmos"
```

### 2. Run the backend

Windows PowerShell:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

macOS / Linux:

```bash
cd backend
./mvnw spring-boot:run
```

The backend starts on:

```text
http://localhost:8080
```

Useful backend endpoints:

- `POST /api/users/join`
- `DELETE /api/users/leave/{userId}`
- `GET /api/chat/{roomId}`
- `WS /ws` for SockJS/STOMP

Connection lifecycle notes:

- the frontend sends periodic heartbeat messages while connected
- the frontend also sends an explicit leave request on app exit when possible
- the backend removes dead sessions on websocket disconnect
- if a disconnect event is missed, the backend scheduled cleaner removes stale inactive sessions

### 3. Install frontend dependencies

```bash
cd frontend
npm install
```

### 4. Run the frontend

```bash
cd frontend
npm run dev
```

The frontend starts on:

```text
http://localhost:5173
```

In development, Vite proxies:

- `/api` -> `http://localhost:8080`
- `/ws` -> `http://localhost:8080`

### 5. Use the app

1. Open `http://localhost:5173`
2. Join with a username
3. Open a second browser or device and join with another username
4. Move the players close together
5. The chat panel should appear when they enter proximity and close when they move out of range

## Local Verification

Run these from the repo root or from the app folders.

### Backend tests

Windows PowerShell:

```powershell
cd backend
.\mvnw.cmd test
```

macOS / Linux:

```bash
cd backend
./mvnw test
```

### Frontend production build

```bash
cd frontend
npm run build
```

## Production Build Outputs

### Backend artifact

Build the backend jar:

Windows PowerShell:

```powershell
cd backend
.\mvnw.cmd clean package
```

macOS / Linux:

```bash
cd backend
./mvnw clean package
```

The jar will be generated under:

```text
backend/target/
```

### Frontend artifact

Build the frontend:

```bash
cd frontend
npm run build
```

The static files will be generated under:

```text
frontend/dist/
```

## Deployment Guide

There are two practical ways to deploy this project.

### Option 1: Deploy frontend and backend separately

This is the simplest approach.

Backend:

- run the Spring Boot jar on a server
- set `SERVER_PORT`, `MONGODB_URI`, `CORS_ALLOWED_ORIGINS`, and the presence cleanup values if you want to tune them

Frontend:

- build `frontend/dist`
- serve it from any static host or web server
- make sure frontend requests `/api` and `/ws` route to the backend

Recommended reverse proxy behavior:

- `/api/*` -> Spring Boot backend
- `/ws/*` -> Spring Boot backend with websocket support enabled
- all other routes -> frontend static app

Example production origin setting:

```text
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com
```

### Option 2: Serve both behind one domain with a reverse proxy

This is usually the cleanest production setup.

Example shape:

- `https://app.example.com/` -> frontend static files
- `https://app.example.com/api/*` -> backend
- `https://app.example.com/ws/*` -> backend websocket endpoint

Benefits:

- no frontend code changes needed because the app already uses relative `/api` and `/ws`
- simpler CORS setup
- easier cookie/session/origin handling

In this model, set:

```text
CORS_ALLOWED_ORIGINS=https://app.example.com
```

## Deployment Checklist

Before deploying, make sure you have:

- a reachable MongoDB instance
- correct `MONGODB_URI`
- correct `CORS_ALLOWED_ORIGINS`
- sensible stale-session settings for your environment
- backend process running
- websocket forwarding enabled for `/ws`
- frontend static files built from `frontend/dist`
- both `npm run build` and backend tests passing

## Git Layout

This project uses a single Git repository at the root:

- the root `.git/` tracks both `backend/` and `frontend/`
- there are no nested Git repositories inside app folders
- the root `.gitignore` excludes generated files such as `backend/target/`, `frontend/node_modules/`, and `frontend/dist/`

## Notes

- backend live multiplayer state is stored in memory
- chat history is persisted to MongoDB
- movement, proximity, and chat use STOMP over SockJS
- frontend heartbeats and backend scheduled cleanup help remove stale sessions
- the world is restricted to a fixed playable area instead of infinite movement
- proximity pairing becomes active at `140px`
- the chat panel uses a small exit buffer near the radius edge to avoid flicker
- the frontend build is healthy, though the main bundle is still larger than ideal
