package com.ryan.virtual_cosmos.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * WebSocket message payload for chat messages within a proximity room.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDTO {

    private String senderId;
    private String senderUsername;
    private String roomId;
    private String content;

    @Builder.Default
    private Instant timestamp = Instant.now();
}
