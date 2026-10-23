package com.shoppingagent.search;

import com.shoppingagent.admin.UserRepository;
import com.shoppingagent.search.dto.SearchRequest;
import com.shoppingagent.search.dto.SearchResponse;
import com.shoppingagent.shared.entity.SearchQuery;
import com.shoppingagent.shared.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/search")
@RequiredArgsConstructor
@Tag(name = "Search", description = "Tìm kiếm và xếp hạng sản phẩm bằng ngôn ngữ tự nhiên")
public class SearchController {

    private final SearchService searchService;
    private final SearchQueryRepository searchQueryRepository;
    private final UserRepository userRepository;

    @PostMapping
    @Operation(
        summary = "Tìm kiếm sản phẩm",
        description = "Nhận câu truy vấn ngôn ngữ tự nhiên, trích xuất ràng buộc bằng LLM, xếp hạng và trả về top-K sản phẩm phù hợp nhất."
    )
    public ResponseEntity<SearchResponse> search(@Valid @RequestBody SearchRequest request) {
        Long resolvedUserId = request.getUserId();
        if (resolvedUserId == null && request.getUserEmail() != null && !request.getUserEmail().isBlank()) {
            Optional<User> uOpt = userRepository.findByEmail(request.getUserEmail().trim().toLowerCase());
            if (uOpt.isPresent()) {
                resolvedUserId = uOpt.get().getId().longValue();
            }
        }
        SearchResponse response = searchService.search(request, resolvedUserId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/history")
    @Operation(
        summary = "Lấy lịch sử tìm kiếm theo người dùng",
        description = "Lấy danh sách các câu tìm kiếm gần nhất được lưu cho tài khoản cá nhân của người dùng."
    )
    public ResponseEntity<List<Map<String, Object>>> getSearchHistory(
            @RequestParam(required = false) String userEmail,
            @RequestParam(required = false) Integer userId,
            @RequestParam(required = false) String sessionId
    ) {
        List<SearchQuery> list = Collections.emptyList();
        if (userId != null) {
            list = searchQueryRepository.findTop20ByUserIdOrderByCreatedAtDesc(userId);
        } else if (userEmail != null && !userEmail.isBlank()) {
            list = searchQueryRepository.findTop20ByUserEmailOrderByCreatedAtDesc(userEmail.trim().toLowerCase());
        } else if (sessionId != null && !sessionId.isBlank()) {
            list = searchQueryRepository.findTop20BySessionIdOrderByCreatedAtDesc(sessionId);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (SearchQuery sq : list) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", sq.getId().toString());
            map.put("queryText", sq.getQueryText());
            map.put("categoryCode", sq.getCategoryDetected() != null ? sq.getCategoryDetected().getCode() : null);
            map.put("timestamp", sq.getCreatedAt() != null ? sq.getCreatedAt().toString() : null);
            if (sq.getExtractedCriteria() != null) {
                map.put("target", sq.getExtractedCriteria().get("target"));
                map.put("budgetMax", sq.getExtractedCriteria().get("budgetMax"));
            }
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }
}
