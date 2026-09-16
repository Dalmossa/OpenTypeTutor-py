import express from 'express';
import type { SessionController } from '../controllers/sessionController.js';

export function createSessionRoutes(controller: SessionController): express.Router {
  const router = express.Router();
  router.post('/', (req, res) => controller.start(req, res));
  router.post('/:sessionId/pause', (req, res) => controller.pause(req, res));
  router.post('/:sessionId/resume', (req, res) => controller.resume(req, res));
  router.post('/:sessionId/abandon', (req, res) => controller.abandon(req, res));
  router.post('/:sessionId/submit', (req, res) => controller.submit(req, res));
  return router;
}