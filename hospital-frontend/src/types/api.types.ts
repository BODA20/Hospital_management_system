export interface ApiResponse<T = any> {
  status: 'success' | 'fail' | 'error';
  message?: string;
  results?: number;
  data?: T;
}

export interface ApiErrorResponse {
  status: 'fail' | 'error';
  message: string;
  errors?: Record<string, string[]>;
}
