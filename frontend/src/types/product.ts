export interface ProductDetailDTO {
  id: number;
  categoryCode: string;
  sku?: string;
  name: string;
  brand: string;
  price: number;
  productUrl?: string;
  avgRating?: number;
  reviewCount?: number;
  specs?: Record<string, any>;
  imageUrls?: string[];
}
