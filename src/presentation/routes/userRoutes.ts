import express from 'express';
import type { UserController } from '../controllers/userController.js';

export function createUserRoutes(controller: UserController): express.Router {
  const router = express.Router();
  router.get('/me', (req, res) => controller.getMe(req, res));
  router.patch('/me', (req, res) => controller.updateLayout(req, res));
  return router;
}