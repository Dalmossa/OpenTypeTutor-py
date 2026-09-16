import express from 'express';
import type { PedagogicalController } from '../controllers/pedagogicalController.js';

export function createPedagogicalRoutes(controller: PedagogicalController): express.Router {
  const router = express.Router();
  router.get('/pedagogical-lesson', (req, res) => controller.nextLesson(req, res));
  router.post('/progress-card', (req, res) => controller.submitCard(req, res));
  router.post('/ergonomic-check', (req, res) => controller.ergonomicCheck(req, res));
  return router;
}