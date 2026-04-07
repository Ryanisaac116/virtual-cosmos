package com.ryan.virtual_cosmos.service;

import com.ryan.virtual_cosmos.config.WorldBounds;
import com.ryan.virtual_cosmos.dto.UserStateDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages active user sessions in-memory using ConcurrentHashMap.
 * This is the real-time state layer — NOT persisted to MongoDB on every update.
 */
@Slf4j
@Service
public class UserSessionService {

    private final ConcurrentHashMap<String, UserStateDTO> activeSessions = new ConcurrentHashMap<>();

    public void addUser(UserStateDTO userState) {
        userState.setLastActivityAt(Instant.now());
        activeSessions.put(userState.getUserId(), userState);
        log.info("User joined: {} ({}) at ({}, {})",
                userState.getUsername(), userState.getUserId(),
                String.format("%.0f", userState.getX()), String.format("%.0f", userState.getY()));
    }

    public UserStateDTO removeUser(String userId) {
        UserStateDTO removed = activeSessions.remove(userId);
        if (removed != null) {
            log.info("User left: {} ({})", removed.getUsername(), userId);
        }
        return removed;
    }

    public UserStateDTO removeUserBySessionId(String sessionId) {
        for (var entry : activeSessions.entrySet()) {
            UserStateDTO state = entry.getValue();
            if (sessionId.equals(state.getSessionId())) {
                if (activeSessions.remove(entry.getKey(), state)) {
                    log.info("User disconnected: {} (session: {})", state.getUsername(), sessionId);
                    return state;
                }
            }
        }
        return null;
    }

    /**
     * Associate a STOMP session ID with an existing user.
     * Called when the WebSocket CONNECT frame arrives with userId header.
     */
    public void setSessionId(String userId, String sessionId) {
        UserStateDTO state = activeSessions.get(userId);
        if (state != null) {
            if (state.getSessionId() != null && !state.getSessionId().equals(sessionId)) {
                log.warn("Replacing active session for user {}: {} -> {}", userId, state.getSessionId(), sessionId);
            }
            state.setSessionId(sessionId);
            state.setLastActivityAt(Instant.now());
            log.debug("Session ID set for user {}: {}", userId, sessionId);
        }
    }

    public boolean isCurrentSession(String userId, String sessionId) {
        UserStateDTO state = activeSessions.get(userId);
        return state != null && sessionId != null && sessionId.equals(state.getSessionId());
    }

    public boolean updatePosition(String userId, String sessionId, double x, double y) {
        UserStateDTO state = activeSessions.get(userId);
        if (state != null && sessionId != null && sessionId.equals(state.getSessionId())) {
            state.setX(WorldBounds.clampX(x));
            state.setY(WorldBounds.clampY(y));
            state.setLastActivityAt(Instant.now());
            return true;
        }
        return false;
    }

    public boolean touchUser(String userId, String sessionId) {
        UserStateDTO state = activeSessions.get(userId);
        if (state != null && sessionId != null && sessionId.equals(state.getSessionId())) {
            state.setLastActivityAt(Instant.now());
            return true;
        }
        return false;
    }

    public List<UserStateDTO> removeStaleUsers(Instant cutoff) {
        List<UserStateDTO> removedUsers = new ArrayList<>();

        for (var entry : activeSessions.entrySet()) {
            UserStateDTO state = entry.getValue();
            Instant lastActivityAt = state.getLastActivityAt();
            if (lastActivityAt != null && lastActivityAt.isBefore(cutoff)) {
                if (activeSessions.remove(entry.getKey(), state)) {
                    removedUsers.add(state);
                    log.warn("Removing stale user session: {} ({}) last active at {}",
                            state.getUsername(), state.getUserId(), lastActivityAt);
                }
            }
        }

        return removedUsers;
    }

    public List<UserStateDTO> getAllUsers() {
        return new ArrayList<>(activeSessions.values());
    }

    public UserStateDTO getUser(String userId) {
        return activeSessions.get(userId);
    }

    public boolean hasUser(String userId) {
        return activeSessions.containsKey(userId);
    }

    public Collection<String> getActiveUserIds() {
        return activeSessions.keySet();
    }

    public int getActiveCount() {
        return activeSessions.size();
    }
}
