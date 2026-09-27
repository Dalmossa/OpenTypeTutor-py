import { Module, type DynamicModule, type Provider } from "@nestjs/common";
import { AuthNestController } from "./authNestController.js";
import { PasswordResetNestController } from "./passwordResetNestController.js";
import { AuthAdminNestController } from "./authAdminNestController.js";
import { UserNestController } from "./userNestController.js";
import { LessonNestController } from "./lessonNestController.js";
import { SessionNestController } from "./sessionNestController.js";
import { ProgressNestController } from "./progressNestController.js";
import { PedagogicalNestController } from "./pedagogicalNestController.js";
import { DashboardNestController } from "./dashboardNestController.js";
import { HealthNestController } from "./healthNestController.js";
import { AdminNestController } from "./adminNestController.js";
import { AdminGuard } from "./admin.guard.js";
import { AuthGuard } from "./auth.guard.js";

export const NEST_CONTROLLERS = [
  HealthNestController,
  AuthNestController,
  PasswordResetNestController,
  AuthAdminNestController,
  UserNestController,
  LessonNestController,
  SessionNestController,
  ProgressNestController,
  PedagogicalNestController,
  DashboardNestController,
  AdminNestController,
] as const;

type DependencyToken = string;
export type NestDependencyValues = Record<DependencyToken, unknown>;

export function buildAppProviders(values: NestDependencyValues): Provider[] {
  const providers: Provider[] = Object.entries(values).map(
    ([token, value]) => ({
      provide: token,
      useValue: value,
    }),
  );
  // AdminGuard entra como provider porque `AuthNestController` o referencia via
  // `@UseGuards` numa rota do mount público — Nest instancia guard por classe,
  // então ele precisa estar registrado no módulo.
  providers.push(AuthGuard, AdminGuard);
  return providers;
}

/* eslint-disable @typescript-eslint/no-extraneous-class -- módulo Nest exige classe com forRoot estático */
@Module({})
export class AppNestModule {
  static forRoot(values: NestDependencyValues): DynamicModule {
    const providers = buildAppProviders(values);
    return {
      module: AppNestModule,
      controllers: [...NEST_CONTROLLERS],
      providers,
      exports: providers,
    };
  }
}
