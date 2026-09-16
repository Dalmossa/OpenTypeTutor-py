import express from 'express';
import type { LessonController } from '../controllers/lessonController.js';

export function createLessonRoutes(controller: LessonController): express.Router {
  const router = express.Router();
  router.get('/', (req, res) => controller.list(req, res));
  router.get('/:id', (req, res) => controller.getById(req, res));
  return router;
}