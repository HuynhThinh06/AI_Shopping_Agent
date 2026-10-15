export interface SummaryDTO {
  summaryText: string;
  pros: string;
  cons: string;
  llmModelUsed?: string;
  generatedAt?: string;
  cached: boolean;
}

export interface ReviewResponseDTO {
  id: number;
  productId: number;
  reviewerName: string;
  content: string;
  rating: number;
  isSpam?: boolean;
  createdAt: string;
}

export interface ReviewCreateRequest {
  reviewerName: string;
  rating: number;
  content: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
