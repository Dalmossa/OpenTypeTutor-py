import type { GetUserResponseDTO } from '@/models/auth';
import type { ApiClient } from '@/services/api-client';

export class UserController {
  constructor(private readonly api: ApiClient) {}

  async getSession(token: string): Promise<GetUserResponseDTO> {
    return this.api.getMe(token);
  }
}