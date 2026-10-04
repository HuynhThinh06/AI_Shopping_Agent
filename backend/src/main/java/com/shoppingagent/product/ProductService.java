package com.shoppingagent.product;

import com.shoppingagent.product.dto.ProductCreateRequest;
import com.shoppingagent.product.dto.ProductDetailDTO;
import com.shoppingagent.shared.entity.Category;
import com.shoppingagent.shared.entity.Product;
import com.shoppingagent.shared.entity.ProductImage;
import com.shoppingagent.shared.service.CloudinaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final CloudinaryService cloudinaryService;

    public ProductDetailDTO getById(Long id) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException(id));
        return toDetailDTO(p);
    }

    /**
     * [MỚI - B7] Tìm kiếm sản phẩm với filter tùy chọn + phân trang.
     *
     * Tất cả tham số filter đều nullable:
     *   - categoryCode null → không lọc theo ngành hàng
     *   - minPrice / maxPrice null → không giới hạn giá
     *   - keyword null → không lọc theo tên/hãng
     *
     * Mặc định sắp xếp: avg_rating giảm dần (sản phẩm được đánh giá cao lên trước).
     *
     * @param page  Số trang, bắt đầu từ 0
     * @param size  Số sản phẩm mỗi trang (Controller giới hạn tối đa 50)
     */
    public Page<ProductDetailDTO> searchProducts(String categoryCode,
                                                  Long   minPrice,
                                                  Long   maxPrice,
                                                  String keyword,
                                                  int    page,
                                                  int    size) {
        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by("avgRating").descending()
        );
        return productRepository
                .searchProducts(categoryCode, minPrice, maxPrice, keyword, pageable)
                .map(this::toDetailDTO);
    }

    @Transactional
    public ProductDetailDTO createProduct(ProductCreateRequest request, List<MultipartFile> images) {
        Category category = categoryRepository.findByCode(request.getCategoryCode())
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + request.getCategoryCode()));

        Product product = Product.builder()
                .category(category)
                .sku(request.getSku())
                .name(request.getName())
                .brand(request.getBrand())
                .price(request.getPrice())
                .productUrl(request.getProductUrl())
                .specs(request.getSpecs())
                .build();

        List<ProductImage> productImages = new ArrayList<>();
        if (images != null && !images.isEmpty()) {
            boolean isFirst = true;
            for (MultipartFile file : images) {
                try {
                    String url = cloudinaryService.uploadImage(file);
                    ProductImage img = ProductImage.builder()
                            .product(product)
                            .imageUrl(url)
                            .isPrimary(isFirst)
                            .build();
                    productImages.add(img);
                    isFirst = false;
                } catch (IOException e) {
                    log.error("Error uploading image to Cloudinary", e);
                    throw new RuntimeException("Failed to upload image", e);
                }
            }
        }
        product.setImages(productImages);

        Product saved = productRepository.save(product);
        return toDetailDTO(saved);
    }

    private ProductDetailDTO toDetailDTO(Product p) {
        List<String> imageUrls = p.getImages() != null ? 
                p.getImages().stream().map(ProductImage::getImageUrl).collect(Collectors.toList()) : 
                new ArrayList<>();

        return ProductDetailDTO.builder()
                .id(p.getId())
                .categoryCode(p.getCategory().getCode())
                .sku(p.getSku())
                .name(p.getName())
                .brand(p.getBrand())
                .price(p.getPrice())
                .productUrl(p.getProductUrl())
                .avgRating(p.getAvgRating())
                .reviewCount(p.getReviewCount())
                .specs(p.getSpecs())
                .imageUrls(imageUrls)
                .build();
    }
}
