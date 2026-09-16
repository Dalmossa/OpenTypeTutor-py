import type { Request, Response } from 'express';
import type { GetUserPort, UpdateUserLayoutPort } from '../ports/useCasePorts.js';
import { updateLayoutSchema } from '../validators/userValidators.js';
import { parseSchema } from '../validation/zodErrorMap.js';
import { getAuthUserId } from '../middlewares/authMiddleware.js';

export class UserController {
  constructor(
    private readonly getUser: GetUserPort,
    private readonly updateUserLayout: UpdateUserLayoutPort
  ) {}

  async getMe(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    const result = await this.getUser.execute(userId, userId);
    res.json(result);
  }

  async updateLayout(req: Request, res: Response): Promise<void> {
    const userId = getAuthUserId(req);
    const body = parseSchema(updateLayoutSchema, req.body);
    const result = await this.updateUserLayout.execute(userId, { userId, layout: body.layout });
    res.json(result);
  }
}