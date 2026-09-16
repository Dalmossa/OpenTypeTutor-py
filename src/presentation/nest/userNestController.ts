import { Body, Controller, Get, Inject, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { GetUserResponseDTO, UpdateUserLayoutResponseDTO } from '../../application/dtos/UserDTOs.js';
import type { GetUserPort, UpdateUserLayoutPort } from '../ports/useCasePorts.js';
import { updateLayoutSchema } from '../validators/userValidators.js';
import { parseSchema } from '../validation/zodErrorMap.js';
import { AuthGuard, getRequestUserId } from './auth.guard.js';
import { TOKENS } from './nestTokens.js';

@Controller('/users')
@UseGuards(AuthGuard)
export class UserNestController {
  constructor(
    @Inject(TOKENS.GET_USER) private readonly getUser: GetUserPort,
    @Inject(TOKENS.UPDATE_USER_LAYOUT) private readonly updateUserLayout: UpdateUserLayoutPort
  ) {}

  @Get('me')
  async getMe(@Req() req: Request): Promise<GetUserResponseDTO> {
    const userId = getRequestUserId(req);
    return this.getUser.execute(userId, userId);
  }

  @Patch('me')
  async updateLayout(@Req() req: Request, @Body() body: unknown): Promise<UpdateUserLayoutResponseDTO> {
    const userId = getRequestUserId(req);
    const parsed = parseSchema(updateLayoutSchema, body);
    return this.updateUserLayout.execute(userId, { userId, layout: parsed.layout });
  }
}