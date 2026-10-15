export interface SearchRequest {
  queryText: string;
  sessionId?: string;
  topK?: number;
}

export interface ExtractedCriteria {
  categoryCode?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  target?: string | null;
  requiredSpecs?: Record<string, string>;
}

export interface RankedProduct {
  productId: number;
  productName: string;
  brand?: string;
  price: number;
  avgRating?: number;
  reviewCount?: number;
  primaryImageUrl?: string;
  specs?: Record<string, any>;
  rankPosition: number;
  score: number;
  specMatchScore?: number;
  priceScore?: number;
  ratingScore?: number;
}

export interface SearchResponse {
  queryId: number;
  extractedCriteria: ExtractedCriteria;
  results: RankedProduct[];
  totalMatched: number;
}
