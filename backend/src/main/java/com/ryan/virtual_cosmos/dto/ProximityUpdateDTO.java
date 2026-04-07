package com.ryan.virtual_cosmos.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

/**
 * Payload sent over WebSocket to /topic/proximity.
 * Tells a client which users are currently nearby.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProximityUpdateDTO {
    private String userId;
    private Set<String> nearbyUsers;
}
