import type { ApiClient } from "@/services/api-client";
import { createApiClient } from "@/services/api-client";
import { AuthController } from "./auth-controller";
import { DashboardController } from "./dashboard-controller";
import { LessonController } from "./lesson-controller";
import { PedagogicalController } from "./pedagogical-controller";
import { ProgressController } from "./progress-controller";
import { SessionController } from "./session-controller";
import { UserController } from "./user-controller";

export { ApiError } from "@/services/api-client";

export interface Controllers {
  auth: AuthController;
  user: UserController;
  lessons: LessonController;
  pedagogical: PedagogicalController;
  progress: ProgressController;
  sessions: SessionController;
  dashboard: DashboardController;
}

export function createControllers(
  api: ApiClient = createApiClient(),
): Controllers {
  return {
    auth: new AuthController(api),
    user: new UserController(api),
    lessons: new LessonController(api),
    pedagogical: new PedagogicalController(api),
    progress: new ProgressController(api),
    sessions: new SessionController(api),
    dashboard: new DashboardController(api),
  };
}
