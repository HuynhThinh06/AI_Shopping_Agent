package com.shoppingagent.shared.security;

import com.shoppingagent.admin.UserRepository;
import com.shoppingagent.shared.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserAuthCacheService {

    private final UserRepository userRepository;

    public record UserAuthSnapshot(
            Integer id,
            String username,
            String email,
            String role,
            boolean active
    ) {}

    @Transactional(readOnly = true)
    @Cacheable(value = "userAuthStatus", key = "#userId")
    public UserAuthSnapshot getSnapshot(Integer userId) {
        if (userId == null) {
            return new UserAuthSnapshot(null, null, null, null, false);
        }
        return userRepository.findById(userId)
                .map(this::toSnapshot)
                .orElseGet(() -> new UserAuthSnapshot(userId, null, null, null, false));
    }

    @Transactional(readOnly = true)
    public UserAuthSnapshot getSnapshotByUsername(String username) {
        if (username == null || username.isBlank()) {
            return new UserAuthSnapshot(null, null, null, null, false);
        }
        return userRepository.findByUsername(username)
                .map(this::toSnapshot)
                .orElseGet(() -> new UserAuthSnapshot(null, username, null, null, false));
    }

    @CacheEvict(value = "userAuthStatus", key = "#userId")
    public void evictUser(Integer userId) {
        log.debug("[AuthCache] Evicted userAuthStatus cache for userId={}", userId);
    }

    private UserAuthSnapshot toSnapshot(User u) {
        return new UserAuthSnapshot(
                u.getId(),
                u.getUsername(),
                u.getEmail(),
                u.getRole(),
                Boolean.TRUE.equals(u.getIsActive())
        );
    }
}
