package com.ryan.virtual_cosmos.websocket;

import com.ryan.virtual_cosmos.dto.HeartbeatDTO;
import com.ryan.virtual_cosmos.service.UserSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class HeartbeatHandler {

    private final UserSessionService userSessionService;

    @MessageMapping("/heartbeat")
    public void handleHeartbeat(HeartbeatDTO heartbeat, SimpMessageHeaderAccessor headerAccessor) {
        if (heartbeat != null && heartbeat.getUserId() != null) {
            userSessionService.touchUser(heartbeat.getUserId(), headerAccessor.getSessionId());
        }
    }
}
