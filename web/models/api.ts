export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface HealthDTO {
  status: string;
  timestamp: string;
}