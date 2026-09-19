import type { ApiErrorPayload, HealthDTO } from '@/models/api';
import type {
  GetUserResponseDTO,
  LoginDTO,
  LoginResponseDTO,
  RefreshTokenDTO,
  RefreshTokenResponseDTO,
  RegisterUserDTO,
  RegisterUserResponseDTO,
} from '@/models/auth';
import type { LessonDTO, LessonPerformanceDTO } from '@/models/lesson';
import type { GetUserProgressDTO, KeyPerformanceDTO, PracticeStatusDTO, ResetProgressResponseDTO } from '@/models/progress';
import type {
  ErgonomicCheckDTO,
  ErgonomicCheckResponseDTO,
  GetNextPedagogicalLessonResponseDTO,
  SubmitProgressCardDTO,
  SubmitProgressCardResponseDTO,
} from '@/models/pedagogical';
import type {
  SessionCommandResponseDTO,
  StartSessionDTO,
  StartSessionResponseDTO,
  SubmitSessionDTO,
  SubmitSessionResponseDTO,
} from '@/models/session';

export const DEFAULT_BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';
export const API_PREFIX = '/api';
// TASK-080 follow-up (RNF06): quando NEXT_PUBLIC_API_URL é informado no build,
// o navegador chama o backend diretamente (CORS no backend) em vez de passar
// pelo rewrite /api/* do Next — o proxy do Next é o gargalo sob carga concorrente.
export const DIRECT_API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
};

export class ApiClient {
  readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ??
      (typeof window === 'undefined'
        ? DEFAULT_BACKEND_URL
        : DIRECT_API_URL !== ''
          ? DIRECT_API_URL
          : `${window.location.origin}${API_PREFIX}`);
  }

  private async request<T>(path: string, options: RequestOptions = {}, token?: string): Promise<T> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (token !== undefined) {
      headers.authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw await this.toApiError(response);
    }

    return (await response.json()) as T;
  }

  private async toApiError(response: Response): Promise<ApiError> {
    let payload: ApiErrorPayload | undefined;
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      payload = undefined;
    }

    const error = payload?.error;
    return new ApiError(
      response.status,
      error?.code ?? 'HTTP_ERROR',
      error?.message ?? `Erro HTTP ${String(response.status)}`,
      error?.details,
    );
  }

  async getHealth(): Promise<HealthDTO> {
    return this.request<HealthDTO>('/health');
  }

  async login(data: LoginDTO): Promise<LoginResponseDTO> {
    return this.request<LoginResponseDTO>('/auth/login', { method: 'POST', body: data });
  }

  async register(data: RegisterUserDTO): Promise<RegisterUserResponseDTO> {
    return this.request<RegisterUserResponseDTO>('/auth/register', { method: 'POST', body: data });
  }

  async refresh(data: RefreshTokenDTO): Promise<RefreshTokenResponseDTO> {
    return this.request<RefreshTokenResponseDTO>('/auth/refresh', { method: 'POST', body: data });
  }

  async getMe(token: string): Promise<GetUserResponseDTO> {
    return this.request<GetUserResponseDTO>('/users/me', {}, token);
  }

  async listLessons(token: string): Promise<LessonDTO[]> {
    return this.request<LessonDTO[]>('/lessons', {}, token);
  }

  async getLesson(id: string, token: string): Promise<LessonDTO> {
    return this.request<LessonDTO>(`/lessons/${id}`, {}, token);
  }

  async startSession(data: StartSessionDTO, token: string): Promise<StartSessionResponseDTO> {
    return this.request<StartSessionResponseDTO>('/sessions', { method: 'POST', body: data }, token);
  }

  async pauseSession(sessionId: string, token: string): Promise<SessionCommandResponseDTO> {
    return this.request<SessionCommandResponseDTO>(`/sessions/${sessionId}/pause`, { method: 'POST' }, token);
  }

  async resumeSession(sessionId: string, token: string): Promise<SessionCommandResponseDTO> {
    return this.request<SessionCommandResponseDTO>(`/sessions/${sessionId}/resume`, { method: 'POST' }, token);
  }

  async abandonSession(sessionId: string, token: string): Promise<SessionCommandResponseDTO> {
    return this.request<SessionCommandResponseDTO>(`/sessions/${sessionId}/abandon`, { method: 'POST' }, token);
  }

  async submitSession(sessionId: string, data: SubmitSessionDTO, token: string): Promise<SubmitSessionResponseDTO> {
    return this.request<SubmitSessionResponseDTO>(`/sessions/${sessionId}/submit`, { method: 'POST', body: data }, token);
  }

  async getProgress(token: string): Promise<GetUserProgressDTO> {
    return this.request<GetUserProgressDTO>('/me/progress', {}, token);
  }

  // RN31 - apaga o progresso do usuário autenticado e volta ao nível 1
  async resetProgress(token: string): Promise<ResetProgressResponseDTO> {
    return this.request<ResetProgressResponseDTO>('/me/progress', { method: 'DELETE' }, token);
  }

  async getNextPedagogicalLesson(
    confirmsNoLookingAtKeyboard: boolean,
    token: string,
  ): Promise<GetNextPedagogicalLessonResponseDTO> {
    return this.request<GetNextPedagogicalLessonResponseDTO>(
      `/me/pedagogical-lesson?confirmsNoLookingAtKeyboard=${String(confirmsNoLookingAtKeyboard)}`,
      {},
      token,
    );
  }

  async submitProgressCard(data: SubmitProgressCardDTO, token: string): Promise<SubmitProgressCardResponseDTO> {
    return this.request<SubmitProgressCardResponseDTO>('/me/progress-card', { method: 'POST', body: data }, token);
  }

  async ergonomicCheck(data: ErgonomicCheckDTO, token: string): Promise<ErgonomicCheckResponseDTO> {
    return this.request<ErgonomicCheckResponseDTO>('/me/ergonomic-check', { method: 'POST', body: data }, token);
  }

  async getKeyPerformance(token: string): Promise<KeyPerformanceDTO[]> {
    return this.request<KeyPerformanceDTO[]>('/me/key-performance', {}, token);
  }

  // RN32 - status visual por lição (NOT_STARTED/MASTERED/REVIEW/PRACTICING)
  async getLessonPerformance(token: string): Promise<LessonPerformanceDTO[]> {
    return this.request<LessonPerformanceDTO[]>('/me/lessons/performance', {}, token);
  }

  // RN33 - estado de pacing (acumulado, limites e pausa restante) para a UI cronometrar
  async getPracticeStatus(token: string): Promise<PracticeStatusDTO> {
    return this.request<PracticeStatusDTO>('/me/practice-status', {}, token);
  }
}

export function createApiClient(baseUrl?: string): ApiClient {
  return new ApiClient(baseUrl);
}