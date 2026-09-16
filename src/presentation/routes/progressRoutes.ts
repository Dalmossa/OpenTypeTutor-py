import express from 'express';
import type { ProgressController } from '../controllers/progressController.js';

export function createProgressRoutes(controller: ProgressController): express.Router {
  const router = express.Router();
  router.get('/reinforcement-lesson', (req, res) => controller.reinforcementLesson(req, res));
  router.get('/progress', (req, res) => controller.progress(req, res));
  router.get('/key-performance', (req, res) => controller.keyPerformance(req, res));
  return router;
}