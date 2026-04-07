package com.ryan.virtual_cosmos.websocket;

import com.ryan.virtual_cosmos.dto.ChatMessageDTO;
import com.ryan.virtual_cosmos.service.ChatService;
import com.ryan.virtual_cosmos.service.UserSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.Instant;

/**
 * Handles proximity chat messages over STOMP.
 * Clients send to /app/chat → this persists to MongoDB and broadcasts to /topic/chat/{roomId}.
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatHandler {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserSessionService userSessionService;

    @MessageMapping("/chat")
    public void handleChatMessage(ChatMessageDTO message, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        boolean touched = userSessionService.touchUser(message.getSenderId(), sessionId);
        if (!touched) {
            log.warn("Ignoring stale chat message for user {} from session {}", message.getSenderId(), sessionId);
            return;
        }

        // Set timestamp if not provided
        if (message.getTimestamp() == null) {
            message.setTimestamp(Instant.now());
        }

        // Persist to MongoDB
        chatService.saveMessage(message);

        // Broadcast to the specific room's topic
        messagingTemplate.convertAndSend("/topic/chat/" + message.getRoomId(), message);

        log.debug("Chat [{}]: {} → {}", message.getRoomId(), message.getSenderUsername(), message.getContent());
    }
}
