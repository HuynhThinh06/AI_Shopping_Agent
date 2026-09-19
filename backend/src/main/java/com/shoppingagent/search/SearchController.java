package com.shoppingagent.search;

import com.shoppingagent.search.dto.SearchRequest;
import com.shoppingagent.search.dto.SearchResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/search")
@RequiredArgsConstructor
@Tag(name = "Search", description = "Tìm kiếm và xếp hạng sản phẩm bằng ngôn ngữ tự nhiên")
public class SearchController {

    private final SearchService searchService;

    @PostMapping
    @Operation(
        summary = "Tìm kiếm sản phẩm",
        description = "Nhận câu truy vấn ngôn ngữ tự nhiên, trích xuất ràng buộc bằng LLM, xếp hạng và trả về top-K sản phẩm phù hợp nhất."
    )
    public ResponseEntity<SearchResponse> search(@Valid @RequestBody SearchRequest request) {
        // userId = null khi chưa tích hợp authentication
        SearchResponse response = searchService.search(request, null);
        return ResponseEntity.ok(response);
    }
}
