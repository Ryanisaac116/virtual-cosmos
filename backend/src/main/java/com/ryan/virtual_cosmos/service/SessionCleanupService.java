package com.ryan.virtual_cosmos.service;

import com.ryan.virtual_cosmos.dto.UserStateDTO;
import com.ryan.virtual_cosmos.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SessionCleanupService {

    private final UserSessionService userSessionService;
    private final ProximityService proximityService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    public boolean removeUserByUserId(String userId, String reason) {
        UserStateDTO removedUser = userSessionService.removeUser(userId);
        if (removedUser == null) {
            return false;
        }

        finalizeRemoval(removedUser, reason);
        return true;
    }

    public boolean removeUserBySessionId(String sessionId, String reason) {
        UserStateDTO removedUser = userSessionService.removeUserBySessionId(sessionId);
        if (removedUser == null) {
            return false;
        }

        finalizeRemoval(removedUser, reason);
        return true;
    }

    public int removeStaleUsers(Instant cutoff) {
        List<UserStateDTO> removedUsers = userSessionService.removeStaleUsers(cutoff);
        if (removedUsers.isEmpty()) {
            return 0;
        }

        for (UserStateDTO removedUser : removedUsers) {
            finalizeRemoval(removedUser, "stale session");
        }

        return removedUsers.size();
    }

    private void finalizeRemoval(UserStateDTO removedUser, String reason) {
        userRepository.findById(removedUser.getUserId()).ifPresent(user -> {
            user.setLastSeen(Instant.now());
            userRepository.save(user);
        });

        List<UserStateDTO> remainingUsers = userSessionService.getAllUsers();
        proximityService.handleDisconnect(removedUser.getUserId(), remainingUsers);
        messagingTemplate.convertAndSend("/topic/positions", remainingUsers);

        log.info("Cleaned up user {} ({}) due to {}",
                removedUser.getUsername(), removedUser.getUserId(), reason);
    }
}
