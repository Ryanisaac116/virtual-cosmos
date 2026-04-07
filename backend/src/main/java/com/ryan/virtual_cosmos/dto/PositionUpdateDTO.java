package com.ryan.virtual_cosmos.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * WebSocket message payload for player movement updates.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PositionUpdateDTO {

    private String userId;
    private double x;
    private double y;
}
