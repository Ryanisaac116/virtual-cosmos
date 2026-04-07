package com.ryan.virtual_cosmos.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * In-memory representation of an active user's real-time state.
 * Stored in ConcurrentHashMap — NOT persisted to MongoDB on every update.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserStateDTO {

    private String userId;
    private String username;
    private String avatarColor;
    private double x;
    private double y;
    private String sessionId;
    private Instant lastActivityAt;
    
    @Builder.Default
    private java.util.Set<String> nearbyUsers = new java.util.concurrent.ConcurrentHashMap<String, Boolean>().newKeySet();
}
