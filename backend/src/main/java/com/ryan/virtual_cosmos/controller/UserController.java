package com.ryan.virtual_cosmos.controller;

import com.ryan.virtual_cosmos.config.WorldBounds;
import com.ryan.virtual_cosmos.dto.JoinRequestDTO;
import com.ryan.virtual_cosmos.dto.UserStateDTO;
import com.ryan.virtual_cosmos.model.User;
import com.ryan.virtual_cosmos.repository.UserRepository;
import com.ryan.virtual_cosmos.service.SessionCleanupService;
import com.ryan.virtual_cosmos.service.UserSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final UserSessionService userSessionService;
    private final SessionCleanupService sessionCleanupService;

    /**
     * Register / join the cosmos.
     * 1. Persist user to MongoDB (or fetch existing).
     * 2. Register in-memory session with random spawn position.
     * 3. Return userId, username, avatarColor, and spawn coordinates.
     */
    @PostMapping("/join")
    public ResponseEntity<Map<String, Object>> joinCosmos(@RequestBody JoinRequestDTO request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseGet(() -> userRepository.save(
                        User.builder()
                                .username(request.getUsername())
                                .avatarColor(request.getAvatarColor())
                                .createdAt(Instant.now())
                                .lastSeen(Instant.now())
                                .build()
                ));

        // Update lastSeen and avatar color for returning users
        user.setLastSeen(Instant.now());
        user.setAvatarColor(request.getAvatarColor());
        userRepository.save(user);

        // Assign random spawn position
        double spawnX = ThreadLocalRandom.current().nextDouble(WorldBounds.MIN_X, WorldBounds.MAX_X);
        double spawnY = ThreadLocalRandom.current().nextDouble(WorldBounds.MIN_Y, WorldBounds.MAX_Y);

        // Register in-memory session (sessionId set later on WebSocket connect)
        UserStateDTO state = UserStateDTO.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .avatarColor(user.getAvatarColor())
                .x(spawnX)
                .y(spawnY)
                .build();
        userSessionService.addUser(state);

        return ResponseEntity.ok(Map.of(
                "userId", user.getId(),
                "username", user.getUsername(),
                "avatarColor", user.getAvatarColor(),
                "spawnX", spawnX,
                "spawnY", spawnY
        ));
    }

    /**
     * Debug/health endpoint — returns all currently connected users.
     */
    @GetMapping("/active")
    public ResponseEntity<List<UserStateDTO>> getActiveUsers() {
        return ResponseEntity.ok(userSessionService.getAllUsers());
    }

    @DeleteMapping("/leave/{userId}")
    public ResponseEntity<Void> leaveCosmos(
            @PathVariable String userId,
            @RequestParam(required = false) String sessionId) {
        if (sessionId != null && !userSessionService.isCurrentSession(userId, sessionId)) {
            return ResponseEntity.noContent().build();
        }

        sessionCleanupService.removeUserByUserId(userId, "explicit leave");
        return ResponseEntity.noContent().build();
    }
}
