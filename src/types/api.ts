/**
 * ------------------------------------------------------------------
 * Cross-feature API response shapes
 * ------------------------------------------------------------------
 */

export type ApiResponse<T> = {
  success: true;
  data: T;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

export type PageParams = {
  page: number;
  pageSize: number;
};
