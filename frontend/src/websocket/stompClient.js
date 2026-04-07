import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import { WS_URL, STOMP_RECONNECT_DELAY } from '../types/constants';

/**
 * Singleton STOMP client over SockJS.
 * Handles connection, reconnection, and provides subscribe/publish helpers.
 *
 * The client sends a userId in the CONNECT frame's custom headers so the
 * backend can associate the STOMP session with the user in-memory state.
 */
let stompClient = null;
let stompClientUserId = null;
let stompSessionId = null;

export function getStompClient(userId) {
  if (stompClient && (!userId || stompClientUserId === userId)) {
    return stompClient;
  }

  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }

  stompClientUserId = userId ?? stompClientUserId;

  stompClient = new Client({
    webSocketFactory: () => new SockJS(WS_URL),

    // Send userId as a custom header on the STOMP CONNECT frame
    connectHeaders: stompClientUserId ? { userId: stompClientUserId } : {},

    reconnectDelay: STOMP_RECONNECT_DELAY,
    heartbeatIncoming: 20000,
    heartbeatOutgoing: 15000,

    debug: (str) => {
      if (import.meta.env.DEV && !str.includes('PING') && !str.includes('PONG')) {
        console.log('[STOMP]', str);
      }
    },
  });

  return stompClient;
}

/**
 * Reset the singleton so a fresh client can be created (e.g., different user).
 */
export function resetStompClient() {
  if (stompClient) {
    if (stompClient.connected) {
      stompClient.deactivate();
    }
    stompClient = null;
  }
  stompClientUserId = null;
  stompSessionId = null;
}

export function disconnectStomp() {
  if (stompClient && (stompClient.connected || stompClient.active)) {
    stompClient.deactivate();
  }
  stompSessionId = null;
}

export function setCurrentStompSessionId(sessionId) {
  stompSessionId = sessionId ?? null;
}

export function getCurrentStompSessionId() {
  return stompSessionId;
}
