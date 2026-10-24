package com.shoppingagent.favorite;

import com.shoppingagent.favorite.dto.ToggleFavoriteRequest;
import com.shoppingagent.favorite.dto.ToggleFavoriteResponse;
import com.shoppingagent.shared.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/favorites")
@RequiredArgsConstructor
@Tag(name = "Favorites", description = "Quản lý danh sách sản phẩm yêu thích (Wishlist) theo từng tài khoản người dùng")
public class FavoriteController {

    private final FavoriteService favoriteService;

    @GetMapping
    @Operation(summary = "Lấy danh sách ID sản phẩm yêu thích của người dùng",
               description = "Truy vấn danh sách product_id thuộc quyền sở hữu của user đã đăng nhập.")
    public ResponseEntity<List<Long>> getFavorites(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null || principal.getId() == null) {
            return ResponseEntity.status(401).build();
        }
        List<Long> productIds = favoriteService.getFavoriteProductIds(principal.getId());
        return ResponseEntity.ok(productIds);
    }

    @PostMapping("/toggle")
    @Operation(summary = "Thêm hoặc Xóa sản phẩm khỏi danh sách yêu thích",
               description = "Nếu sản phẩm chưa có trong danh sách -> Thêm vào; Nếu đã có -> Xóa bỏ (Toggle).")
    public ResponseEntity<ToggleFavoriteResponse> toggleFavorite(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ToggleFavoriteRequest request
    ) {
        if (principal == null || principal.getId() == null) {
            return ResponseEntity.status(401).build();
        }
        ToggleFavoriteResponse response = favoriteService.toggleFavorite(principal.getId(), request.getProductId());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{productId}")
    @Operation(summary = "Xóa sản phẩm khỏi danh sách yêu thích",
               description = "Xóa triệt để sản phẩm khỏi danh sách yêu thích của người dùng.")
    public ResponseEntity<Map<String, Object>> removeFavorite(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long productId
    ) {
        if (principal == null || principal.getId() == null) {
            return ResponseEntity.status(401).build();
        }
        favoriteService.removeFavorite(principal.getId(), productId);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "productId", productId,
                "message", "Đã xóa sản phẩm khỏi danh sách yêu thích."
        ));
    }
}
