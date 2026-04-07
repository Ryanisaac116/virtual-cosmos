import { useEffect, useRef, useCallback } from 'react';
import {
  getStompClient,
  disconnectStomp,
  getCurrentStompSessionId,
  setCurrentStompSessionId,
} from '../websocket/stompClient';
import { useGameState, useGameDispatch } from '../store/GameContext';
import { HEARTBEAT_INTERVAL_MS, MOVE_THROTTLE_MS, PROXIMITY_RADIUS } from '../types/constants';
import { getProximityCandidates, PROXIMITY_EXIT_RADIUS } from '../lib/proximity';

function sameUserList(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

/**
 * Custom hook to manage WebSocket lifecycle: connect, subscribe, publish, disconnect.
 * Includes a 50ms throttle on position publishes to avoid overwhelming the server.
 */
export function useWebSocket() {
  const { currentUser, nearbyUsers, activeChatRoom, isConnected, players, localPosition } = useGameState();
  const dispatch = useGameDispatch();
  const subscriptionsRef = useRef([]);
  const activeChatSubRef = useRef(null);
  const activeChatPartnerRef = useRef(null);
  const lastMoveTimeRef = useRef(0);

  const connect = useCallback(() => {
    if (!currentUser) return;

    const client = getStompClient(currentUser.userId);
    if (client.connected || client.active) return;

    client.onConnect = (frame) => {
      setCurrentStompSessionId(frame?.headers?.session);
      console.log('[WS] Connected as', currentUser.username);
      dispatch({ type: 'SET_CONNECTED', payload: true });

      // Subscribe to position broadcasts
      const posSub = client.subscribe('/topic/positions', (message) => {
        const players = JSON.parse(message.body);
        dispatch({ type: 'SET_PLAYERS', payload: players });
      });
      subscriptionsRef.current.push(posSub);

      // Subscribe to proximity broadcasts
      const proxSub = client.subscribe('/topic/proximity', (message) => {
        const update = JSON.parse(message.body);
        // We only care about proximity updates that belong to our current user
        if (update.userId === currentUser.userId) {
          dispatch({ type: 'SET_NEARBY_USERS', payload: update.nearbyUsers });
        }
      });
      subscriptionsRef.current.push(proxSub);

      // Send initial position to register on the broadcast
      if (currentUser.spawnX != null && currentUser.spawnY != null) {
        client.publish({
          destination: '/app/move',
          body: JSON.stringify({
            userId: currentUser.userId,
            x: currentUser.spawnX,
            y: currentUser.spawnY,
          }),
        });
      }
    };

    client.onDisconnect = () => {
      setCurrentStompSessionId(null);
      console.log('[WS] Disconnected');
      dispatch({ type: 'SET_CONNECTED', payload: false });
      dispatch({ type: 'CLEAR_CONNECTION_STATE' });
    };

    client.onStompError = (frame) => {
      console.error('[WS] STOMP error:', frame.headers['message']);
    };

    client.activate();
  }, [currentUser, dispatch]);

  const disconnect = useCallback(() => {
    subscriptionsRef.current.forEach((sub) => {
      try { sub.unsubscribe(); } catch (e) { /* ignore */ }
    });
    if (activeChatSubRef.current) {
      try { activeChatSubRef.current.unsubscribe(); } catch(e) {}
      activeChatSubRef.current = null;
    }
    subscriptionsRef.current = [];
    activeChatPartnerRef.current = null;
    disconnectStomp();
    dispatch({ type: 'SET_CONNECTED', payload: false });
    dispatch({ type: 'CLEAR_CONNECTION_STATE' });
  }, [dispatch]);

  /**
   * Throttled position publish — sends at most once per MOVE_THROTTLE_MS.
   */
  const publishPosition = useCallback((userId, x, y) => {
    dispatch({ type: 'SET_LOCAL_POSITION', payload: { x, y } });

    const now = Date.now();
    if (now - lastMoveTimeRef.current < MOVE_THROTTLE_MS) return;
    lastMoveTimeRef.current = now;

    const client = getStompClient();
    if (client && client.connected) {
      client.publish({
        destination: '/app/move',
        body: JSON.stringify({ userId, x, y }),
      });
    }
  }, [dispatch]);

  const publishChat = useCallback((chatMessage) => {
    const client = getStompClient();
    if (client && client.connected) {
      client.publish({
        destination: '/app/chat',
        body: JSON.stringify(chatMessage),
      });
    }
  }, []);

  const sendHeartbeat = useCallback(() => {
    if (!currentUser?.userId) return;

    const client = getStompClient();
    if (client && client.connected) {
      client.publish({
        destination: '/app/heartbeat',
        body: JSON.stringify({ userId: currentUser.userId }),
      });
    }
  }, [currentUser?.userId]);

  const getFallbackNearbyUsers = useCallback(() => {
    return getProximityCandidates(currentUser, players, localPosition)
      .filter((entry) => entry.distance <= PROXIMITY_RADIUS)
      .map((entry) => entry.userId);
  }, [currentUser, players, localPosition]);

  useEffect(() => {
    if (!currentUser) return;

    const computedNearbyUsers = getFallbackNearbyUsers();
    if (!sameUserList(nearbyUsers, computedNearbyUsers)) {
      dispatch({ type: 'SET_NEARBY_USERS', payload: computedNearbyUsers });
    }
  }, [currentUser, nearbyUsers, getFallbackNearbyUsers, dispatch]);

  // Auto-connect chat rooms based on actual distance.
  // A small exit buffer keeps the room stable near the radius edge without leaving it open for long.
  useEffect(() => {
    if (!currentUser) return;
    if (!isConnected) return;

    const client = getStompClient();
    if (!client || !client.connected) return;

    const proximityCandidates = getProximityCandidates(currentUser, players, localPosition);
    const distanceByUserId = new Map(
      proximityCandidates.map((entry) => [entry.userId, entry.distance])
    );

    let nextPartnerId = null;
    const currentPartnerId = activeChatPartnerRef.current;

    if (currentPartnerId) {
      const currentDistance = distanceByUserId.get(currentPartnerId);
      if (currentDistance != null && currentDistance <= PROXIMITY_EXIT_RADIUS) {
        nextPartnerId = currentPartnerId;
      }
    }

    if (!nextPartnerId) {
      const nearestPartner = proximityCandidates[0];
      if (nearestPartner && nearestPartner.distance <= PROXIMITY_RADIUS) {
        nextPartnerId = nearestPartner.userId;
      }
    }

    if (nextPartnerId) {
      activeChatPartnerRef.current = nextPartnerId;
      const roomId = [currentUser.userId, nextPartnerId].sort().join('_');

      if (activeChatRoom !== roomId) {
        if (activeChatSubRef.current) {
          activeChatSubRef.current.unsubscribe();
          activeChatSubRef.current = null;
        }
        const sub = client.subscribe(`/topic/chat/${roomId}`, (message) => {
          const chatMsg = JSON.parse(message.body);
          dispatch({
            type: 'ADD_CHAT_MESSAGE',
            payload: { roomId, message: chatMsg },
          });
        });
        
        activeChatSubRef.current = sub;
        dispatch({ type: 'SET_ACTIVE_CHAT_ROOM', payload: roomId });
      }
    } else {
      activeChatPartnerRef.current = null;

      if (activeChatRoom) {
        if (activeChatSubRef.current) {
          activeChatSubRef.current.unsubscribe();
          activeChatSubRef.current = null;
        }
        dispatch({ type: 'SET_ACTIVE_CHAT_ROOM', payload: null });
      }
    }
  }, [currentUser, activeChatRoom, isConnected, players, localPosition, dispatch]);

  useEffect(() => {
    if (!currentUser || !isConnected) return;

    sendHeartbeat();
    const intervalId = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentUser, isConnected, sendHeartbeat]);

  useEffect(() => {
    if (!currentUser?.userId) return;

    const cleanupOnExit = () => {
      const sessionId = getCurrentStompSessionId();
      const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';

      try {
        fetch(`/api/users/leave/${currentUser.userId}${query}`, {
          method: 'DELETE',
          keepalive: true,
        });
      } catch (error) {
        console.error('Failed to send keepalive leave request', error);
      }

      disconnectStomp();
    };

    window.addEventListener('pagehide', cleanupOnExit);
    window.addEventListener('beforeunload', cleanupOnExit);

    return () => {
      window.removeEventListener('pagehide', cleanupOnExit);
      window.removeEventListener('beforeunload', cleanupOnExit);
    };
  }, [currentUser?.userId]);

  // Auto-connect when user joins, disconnect on unmount
  useEffect(() => {
    if (currentUser) {
      connect();
    }
    return () => disconnect();
  }, [currentUser, connect, disconnect]);

  return {
    connect,
    disconnect,
    publishPosition,
    publishChat,
  };
}
