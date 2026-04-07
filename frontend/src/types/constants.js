/**
 * Application-wide constants for Virtual Cosmos.
 */

// Canvas dimensions
export const CANVAS_WIDTH = 2000;
export const CANVAS_HEIGHT = 2000;

// Player settings
export const PLAYER_RADIUS = 20;
export const PLAYER_SPEED = 4;
export const PLAYER_NAME_OFFSET_Y = -30;

// Proximity
export const PROXIMITY_RADIUS = 140;

// Movement throttle — send WebSocket updates at most every 50ms
export const MOVE_THROTTLE_MS = 50;
export const HEARTBEAT_INTERVAL_MS = 15000;

// Interpolation — smoothing factor for remote player positions (0-1, higher = snappier)
export const INTERPOLATION_FACTOR = 0.25;

// WebSocket
export const WS_URL = '/ws';
export const STOMP_RECONNECT_DELAY = 5000;

// Default avatar colors
export const AVATAR_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#a855f7', // purple
];

// World background
export const GRID_COLOR = 0x1a2332;
export const GRID_LINE_COLOR = 0x1e2d3d;
export const GRID_SPACING = 50;
export const BG_COLOR = 0x0a0e1a;
