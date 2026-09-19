import type { LoginDTO, LoginResponseDTO } from '../../application/dtos/LoginDTO.js';
import type {
  ListLessonsDTO,
  ListLessonsResponseDTO,
} from '../../application/dtos/LessonDTOs.js';
import type { GetUserProgressResponseDTO, ResetProgressResponseDTO } from '../../application/dtos/ProgressDTOs.js';
import type { KeyPerformanceDTO } from '../../domain/entities/KeyPerformance.js';
import type { RefreshTokenDTO, RefreshTokenResponseDTO } from '../../application/dtos/RefreshTokenDTO.js';
import type { RegisterUserDTO, RegisterUserResponseDTO } from '../../application/dtos/RegisterUserDTO.js';
import type {
  SessionCommandDTO,
  SessionCommandResponseDTO,
  StartTypingSessionDTO,
  SubmitTypingSessionDTO,
  SubmitTypingSessionResponseDTO,
} from '../../application/dtos/SessionDTOs.js';
import type {
  GetUserResponseDTO,
  UpdateUserLayoutDTO,
  UpdateUserLayoutResponseDTO,
} from '../../application/dtos/UserDTOs.js';
import type { LessonDTO } from '../../domain/entities/Lesson.js';
import type {
  CheckErgonomicSafetyResponseDTO,
  ErgonomicCheckInput,
  GetNextPedagogicalLessonInputDTO,
  GetNextPedagogicalLessonResponseDTO,
  SubmitProgressCardInputDTO,
  SubmitProgressCardResponseDTO,
} from '../../application/dtos/ProgressCardDTOs.js';
import type { PracticeStatusDTO } from '../../application/dtos/PracticePacingDTOs.js';

export interface RegisterUserPort {
  execute(dto: RegisterUserDTO): Promise<RegisterUserResponseDTO>;
}

export interface LoginPort {
  execute(dto: LoginDTO): Promise<LoginResponseDTO>;
}

export interface RefreshTokenPort {
  execute(dto: RefreshTokenDTO): RefreshTokenResponseDTO;
}

export interface GetUserPort {
  execute(authUserId: string, userId: string): Promise<GetUserResponseDTO>;
}

export interface UpdateUserLayoutPort {
  execute(authUserId: string, dto: UpdateUserLayoutDTO): Promise<UpdateUserLayoutResponseDTO>;
}

export interface ListLessonsPort {
  execute(authUserId: string, filters?: ListLessonsDTO): Promise<ListLessonsResponseDTO>;
}

export interface GetLessonPort {
  execute(lessonId: string): Promise<LessonDTO>;
}

export interface StartSessionPort {
  execute(dto: StartTypingSessionDTO): Promise<SessionCommandResponseDTO>;
}

export interface SessionCommandPort {
  execute(dto: SessionCommandDTO): Promise<SessionCommandResponseDTO>;
}

export interface SubmitSessionPort {
  execute(dto: SubmitTypingSessionDTO): Promise<SubmitTypingSessionResponseDTO>;
}

export interface GetReinforcementLessonPort {
  execute(userId: string): Promise<LessonDTO>;
}

export interface GetUserProgressPort {
  execute(userId: string): Promise<GetUserProgressResponseDTO>;
}

export interface ResetProgressPort {
  execute(userId: string): Promise<ResetProgressResponseDTO>;
}

export interface GetUserKeyPerformancePort {
  execute(userId: string): Promise<KeyPerformanceDTO[]>;
}

export interface GetNextPedagogicalLessonPort {
  execute(dto: GetNextPedagogicalLessonInputDTO): Promise<GetNextPedagogicalLessonResponseDTO>;
}

export interface SubmitProgressCardPort {
  execute(dto: SubmitProgressCardInputDTO): Promise<SubmitProgressCardResponseDTO>;
}

export interface CheckErgonomicSafetyPort {
  execute(dto: ErgonomicCheckInput): Promise<CheckErgonomicSafetyResponseDTO>;
}

export interface GetPracticeStatusPort {
  execute(userId: string): Promise<PracticeStatusDTO>;
}