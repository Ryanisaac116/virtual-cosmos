package com.ryan.virtual_cosmos.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class StaleSessionCleanupService {

    private final SessionCleanupService sessionCleanupService;
    @Value("${app.presence.stale-session-timeout-ms:60000}")
    private long staleSessionTimeoutMs;

    @Scheduled(fixedDelayString = "${app.presence.stale-session-sweep-ms:15000}")
    public void cleanStaleSessions() {
        Instant cutoff = Instant.now()
                .minusMillis(staleSessionTimeoutMs);

        int removedCount = sessionCleanupService.removeStaleUsers(cutoff);
        if (removedCount > 0) {
            log.warn("Removed {} stale session(s)", removedCount);
        }
    }
}
