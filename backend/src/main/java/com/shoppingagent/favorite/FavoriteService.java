package com.shoppingagent.favorite;

import com.shoppingagent.admin.UserRepository;
import com.shoppingagent.favorite.dto.ToggleFavoriteRequest;
import com.shoppingagent.favorite.dto.ToggleFavoriteResponse;
import com.shoppingagent.product.ProductRepository;
import com.shoppingagent.shared.entity.Product;
import com.shoppingagent.shared.entity.User;
import com.shoppingagent.shared.entity.UserFavorite;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final UserFavoriteRepository userFavoriteRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<Long> getFavoriteProductIds(String userEmail, Integer userId) {
        if (userId != null) {
            return userFavoriteRepository.findProductIdsByUserId(userId);
        }
        if (userEmail != null && !userEmail.isBlank()) {
            return userFavoriteRepository.findProductIdsByUserEmail(userEmail.trim().toLowerCase());
        }
        return Collections.emptyList();
    }

    @Transactional
    public ToggleFavoriteResponse toggleFavorite(ToggleFavoriteRequest request) {
        User user = resolveUser(request.getUserEmail(), request.getUserId());
        if (user == null) {
            throw new IllegalArgumentException("Không tìm thấy thông tin người dùng hợp lệ.");
        }

        Long productId = request.getProductId();
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Sản phẩm #" + productId + " không tồn tại."));

        Optional<UserFavorite> existing = userFavoriteRepository.findByUserIdAndProductId(user.getId(), productId);

        if (existing.isPresent()) {
            userFavoriteRepository.delete(existing.get());
            log.info("[Favorite] User #{} ({}) REMOVED product #{}", user.getId(), user.getEmail(), productId);
            return ToggleFavoriteResponse.builder()
                    .productId(productId)
                    .isFavorite(false)
                    .message("Đã xóa khỏi danh sách yêu thích.")
                    .build();
        } else {
            UserFavorite favorite = UserFavorite.builder()
                    .user(user)
                    .product(product)
                    .build();
            userFavoriteRepository.save(favorite);
            log.info("[Favorite] User #{} ({}) ADDED product #{}", user.getId(), user.getEmail(), productId);
            return ToggleFavoriteResponse.builder()
                    .productId(productId)
                    .isFavorite(true)
                    .message("Đã lưu vào danh sách yêu thích thành công.")
                    .build();
        }
    }

    @Transactional
    public void removeFavorite(String userEmail, Integer userId, Long productId) {
        User user = resolveUser(userEmail, userId);
        if (user != null && productId != null) {
            userFavoriteRepository.deleteByUserIdAndProductId(user.getId(), productId);
            log.info("[Favorite] User #{} ({}) DELETED product #{}", user.getId(), user.getEmail(), productId);
        }
    }

    private User resolveUser(String email, Integer id) {
        if (id != null) {
            Optional<User> byId = userRepository.findById(id);
            if (byId.isPresent()) return byId.get();
        }
        if (email != null && !email.isBlank()) {
            String cleanEmail = email.trim().toLowerCase();
            return userRepository.findByEmail(cleanEmail).orElseGet(() -> {
                String usernameBase = cleanEmail.split("@")[0].replaceAll("[^a-zA-Z0-9_]", "_");
                String username = usernameBase;
                int suffix = 1;
                while (userRepository.findByUsername(username).isPresent()) {
                    username = usernameBase + "_" + suffix++;
                }

                User newUser = User.builder()
                        .username(username)
                        .email(cleanEmail)
                        .passwordHash("$2a$10$w8T0pC0sJpUjV/y6aJm6E.b9V7H9pI1jD8kF2lM4nO5pQ6rS7tU8v")
                        .displayName(usernameBase)
                        .role(cleanEmail.contains("admin") ? "admin" : "user")
                        .isActive(true)
                        .build();
                User saved = userRepository.save(newUser);
                log.info("[Favorite] Auto-provisioned user record for email: {} with id: {}", cleanEmail, saved.getId());
                return saved;
            });
        }
        return null;
    }
}
