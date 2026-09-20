import express from "express";
import type { DashboardController } from "../controllers/dashboardController.js";

export function createDashboardRoutes(
  controller: DashboardController,
): express.Router {
  const router = express.Router();
  router.get("/habits", (req, res) => controller.habits(req, res));
  router.get("/mastery", (req, res) => controller.mastery(req, res));
  router.get("/proximity", (req, res) => controller.proximity(req, res));
  return router;
}
