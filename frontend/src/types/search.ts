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
  productName?: string;
  name?: string;
  brand?: string;
  price: number;
  avgRating?: number;
  reviewCount?: number;
  primaryImageUrl?: string;
  productUrl?: string;
  specs?: Record<string, any>;
  rankPosition: number;
  score: number;
  specMatchScore?: number;
  priceScore?: number;
  ratingScore?: number;
  reasoning?: string;
  calculatedReasoning?: string;
}

export interface SearchResponse {
  queryId: number;
  extractedCriteria: ExtractedCriteria;
  results: RankedProduct[];
  totalMatched: number;
}
