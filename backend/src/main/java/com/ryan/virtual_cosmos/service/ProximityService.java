package com.ryan.virtual_cosmos.service;

import com.ryan.virtual_cosmos.dto.ProximityUpdateDTO;
import com.ryan.virtual_cosmos.dto.UserStateDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

/**
 * Handles Euclidean distance calculations for proximity-based features.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProximityService {

    public static final double PROXIMITY_RADIUS = 140.0;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Calculate Euclidean distance between two points.
     */
    public double calculateDistance(double x1, double y1, double x2, double y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    /**
     * Updates proximity state for a moved user and everyone else.
     * Broadcasts updates sequentially only to users whose states changed.
     */
    public void updateProximities(UserStateDTO movedUser, List<UserStateDTO> allUsers) {
        for (UserStateDTO otherUser : allUsers) {
            String movedId = movedUser.getUserId();
            String otherId = otherUser.getUserId();

            if (movedId.equals(otherId)) continue;

            boolean currentlyNearby = calculateDistance(movedUser.getX(), movedUser.getY(), otherUser.getX(), otherUser.getY()) < PROXIMITY_RADIUS;
            boolean previouslyNearby = movedUser.getNearbyUsers().contains(otherId);

            if (currentlyNearby && !previouslyNearby) {
                // Newly connected
                movedUser.getNearbyUsers().add(otherId);
                otherUser.getNearbyUsers().add(movedId);
                
                broadcastProximityUpdate(movedId, movedUser.getNearbyUsers());
                broadcastProximityUpdate(otherId, otherUser.getNearbyUsers());
                log.debug("Users {} and {} entered proximity", movedId, otherId);

            } else if (!currentlyNearby && previouslyNearby) {
                // Newly disconnected
                movedUser.getNearbyUsers().remove(otherId);
                otherUser.getNearbyUsers().remove(movedId);
                
                broadcastProximityUpdate(movedId, movedUser.getNearbyUsers());
                broadcastProximityUpdate(otherId, otherUser.getNearbyUsers());
                log.debug("Users {} and {} left proximity", movedId, otherId);
            }
        }
    }

    private void broadcastProximityUpdate(String userId, Set<String> nearbyUsers) {
        messagingTemplate.convertAndSend("/topic/proximity", ProximityUpdateDTO.builder()
                .userId(userId)
                .nearbyUsers(nearbyUsers)
                .build());
    }

    /**
     * Remove a user completely from all proximity sets upon disconnect.
     */
    public void handleDisconnect(String disconnectedUserId, List<UserStateDTO> remainingUsers) {
        for (UserStateDTO user : remainingUsers) {
            if (user.getNearbyUsers().remove(disconnectedUserId)) {
                broadcastProximityUpdate(user.getUserId(), user.getNearbyUsers());
            }
        }
    }

    /**
     * Generate a deterministic room ID for a pair of users (sorted to ensure consistency).
     */
    public static String generateRoomId(String userId1, String userId2) {
        return userId1.compareTo(userId2) < 0
                ? userId1 + "_" + userId2
                : userId2 + "_" + userId1;
    }
}
