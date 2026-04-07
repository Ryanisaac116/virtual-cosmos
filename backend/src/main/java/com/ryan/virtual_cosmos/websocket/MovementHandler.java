package com.ryan.virtual_cosmos.websocket;

import com.ryan.virtual_cosmos.dto.PositionUpdateDTO;
import com.ryan.virtual_cosmos.dto.UserStateDTO;
import com.ryan.virtual_cosmos.service.ProximityService;
import com.ryan.virtual_cosmos.service.UserSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.List;

/**
 * Handles real-time player movement over STOMP.
 * Clients send to /app/move → this broadcasts all positions to /topic/positions.
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class MovementHandler {

    private final UserSessionService userSessionService;
    private final ProximityService proximityService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/move")
    public void handleMovement(PositionUpdateDTO update, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();

        // Update in-memory position (no MongoDB write)
        boolean updated = userSessionService.updatePosition(update.getUserId(), sessionId, update.getX(), update.getY());
        if (!updated) {
            log.warn("Ignoring stale movement update for user {} from session {}", update.getUserId(), sessionId);
            return;
        }

        // Get snapshot of all users
        List<UserStateDTO> allUsers = userSessionService.getAllUsers();
        UserStateDTO movedUser = userSessionService.getUser(update.getUserId());
        
        if (movedUser != null) {
            // Check for new connections/disconnections
            proximityService.updateProximities(movedUser, allUsers);
        }

        // Broadcast all active user positions to every connected client
        messagingTemplate.convertAndSend("/topic/positions", allUsers);
    }
}
