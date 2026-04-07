# Frontend

This directory contains the React client for Virtual Cosmos.

## Stack

- React 19
- Vite 8
- PixiJS 8
- Tailwind CSS 4
- STOMP over SockJS
- Persisted dark/light theme support

## Key files

- `src/main.jsx`: entry point, error boundary, and root providers
- `src/theme/ThemeProvider.jsx`: theme persistence and dark/light mode control
- `src/App.jsx`: join screen vs main workspace switch
- `src/store/GameContext.jsx`: app-wide reducer state
- `src/hooks/useWebSocket.js`: STOMP lifecycle, heartbeats, subscriptions, and disconnect cleanup
- `src/lib/proximity.js`: shared distance checks used by proximity chat
- `src/canvas/GameCanvas.jsx`: world rendering and movement
- `src/components/ChatPanel.jsx`: redesigned proximity chat UI and message composer
- `src/components/ThemeToggle.jsx`: reusable dark/light mode toggle
- `src/pages/CosmosPage.jsx`: page shell with navbar, canvas, and chat overlay

## UI highlights

- Dark and light modes are available throughout the frontend and are persisted in local storage
- The chat panel now follows a cleaner WhatsApp-inspired structure with simpler bubbles, a compact header, and a tighter composer
- Proximity chat is distance-driven: the panel appears only when another player is within range, closes when no one is nearby, and uses a small exit buffer so edge-of-radius movement does not flicker
- The frontend now sends periodic heartbeats and performs explicit leave cleanup on page exit so stale multiplayer sessions do not linger in the UI
- Global typography and input styling were refreshed to make the interface feel more intentional and readable
- The bottom action dock has been removed and the in-world proximity zone is now more visible, with smaller avatars and earlier nearby pairing

## Development

```bash
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies API and websocket traffic to the Spring Boot backend on `http://localhost:8080`.

Run the backend separately from the sibling `../backend` directory.

## Production build

```bash
npm run build
```

The current build is healthy, though Vite reports a large main bundle that could be improved with future code splitting.
