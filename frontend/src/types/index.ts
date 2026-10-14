export interface Category {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export interface Product {
  id: number;
  categoryCode: string;
  sku: string;
  name: string;
  brand: string;
  price: number;
  productUrl?: string;
  avgRating?: number;
  reviewCount?: number;
  specs?: Record<string, any>;
  imageUrls?: string[];
  primaryImageUrl?: string;
}

export interface RankedProduct extends Product {
  rankPosition: number;
  matchScore: number;
  reasoning?: string;
}

export interface ExtractedCriteria {
  categoryCode?: string;
  budgetMin?: number;
  budgetMax?: number;
  requiredSpecs?: Record<string, string>;
  target?: string;
  weightPrice?: number;
  weightRating?: number;
  weightSpec?: number;
}

export interface SearchResponse {
  query: string;
  extractedCriteria: ExtractedCriteria;
  totalMatched: number;
  results: RankedProduct[];
}

export interface SummaryDTO {
  productId: number;
  productName: string;
  overallAssessment: string;
  pros: string[];
  cons: string[];
  reviewCount: number;
  cached: boolean;
  generatedAt?: string;
}

export interface Review {
  id: number;
  productId: number;
  reviewerName: string;
  rating: number;
  content: string;
  createdAt: string;
}
