import express, { type RequestHandler } from 'express';
import type { AuthController } from '../controllers/authController.js';

export function createAuthRoutes(
  controller: AuthController,
  loginRateLimiter: RequestHandler,
  refreshRateLimiter: RequestHandler
): express.Router {
  const router = express.Router();
  router.post('/register', (req, res) => controller.register(req, res));
  router.post('/login', loginRateLimiter, (req, res) => controller.login(req, res));
  router.post('/refresh', refreshRateLimiter, (req, res) => {
    controller.refresh(req, res);
  });
  return router;
}