package com.ryan.virtual_cosmos.websocket;

import com.ryan.virtual_cosmos.service.SessionCleanupService;
import com.ryan.virtual_cosmos.service.UserSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.List;

/**
 * Listens for WebSocket session lifecycle events.
 * - On connect: associates the STOMP session ID with the user.
 * - On disconnect: removes user from in-memory state and broadcasts.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final UserSessionService userSessionService;
    private final SessionCleanupService sessionCleanupService;

    @EventListener
    public void handleWebSocketConnect(SessionConnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = accessor.getSessionId();

        // Extract userId from STOMP native headers (sent by client on CONNECT)
        List<String> userIdHeaders = accessor.getNativeHeader("userId");
        if (userIdHeaders != null && !userIdHeaders.isEmpty()) {
            String userId = userIdHeaders.get(0);
            userSessionService.setSessionId(userId, sessionId);
            log.info("WebSocket session connected: {} → user {}", sessionId, userId);
        }
    }

    @EventListener
    public void handleWebSocketDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = accessor.getSessionId();

        log.info("WebSocket session disconnected: {}", sessionId);

        sessionCleanupService.removeUserBySessionId(sessionId, "websocket disconnect");
    }
}
