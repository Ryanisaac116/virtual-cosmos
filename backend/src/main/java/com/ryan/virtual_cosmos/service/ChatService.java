package com.ryan.virtual_cosmos.service;

import com.ryan.virtual_cosmos.dto.ChatMessageDTO;
import com.ryan.virtual_cosmos.model.ChatMessage;
import com.ryan.virtual_cosmos.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;

    /**
     * Persist a chat message to MongoDB and return the saved entity.
     */
    public ChatMessage saveMessage(ChatMessageDTO dto) {
        ChatMessage message = ChatMessage.builder()
                .senderId(dto.getSenderId())
                .senderUsername(dto.getSenderUsername())
                .roomId(dto.getRoomId())
                .content(dto.getContent())
                .timestamp(dto.getTimestamp() != null ? dto.getTimestamp() : Instant.now())
                .build();

        return chatMessageRepository.save(message);
    }

    /**
     * Retrieve all messages for a given room, ordered chronologically.
     */
    public List<ChatMessage> getMessagesByRoom(String roomId) {
        return chatMessageRepository.findByRoomIdOrderByTimestampAsc(roomId);
    }
}
