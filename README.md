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
- Proximity chat appears only when another player is within the configured distance threshold
- Presence is protected by explicit leave requests, websocket disconnect handling, frontend heartbeats, and backend stale-session cleanup

## Current Features

- username join flow with persistent user lookup
- real-time player movement and broadcasted positions
- visible proximity radius in the world
- proximity-triggered 1:1 chat
- persisted chat history per room
- dark and light theme support
- redesigned join screen and chat UI
- stale connection cleanup on both frontend and backend

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
- proximity pairing becomes active at `140px`
- the chat panel uses a small exit buffer near the radius edge to avoid flicker
- the frontend build is healthy, though the main bundle is still larger than ideal
