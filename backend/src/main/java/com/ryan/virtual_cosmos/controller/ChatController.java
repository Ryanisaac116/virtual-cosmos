package com.ryan.virtual_cosmos.controller;

import com.ryan.virtual_cosmos.model.ChatMessage;
import com.ryan.virtual_cosmos.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/{roomId}")
    public ResponseEntity<List<ChatMessage>> getChatHistory(@PathVariable String roomId) {
        // Return chat history for this room (ordered chronologically)
        List<ChatMessage> history = chatService.getMessagesByRoom(roomId);
        return ResponseEntity.ok(history);
    }
}
