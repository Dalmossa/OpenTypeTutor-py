import { Module, type DynamicModule, type Provider } from "@nestjs/common";
import { AuthNestController } from "./authNestController.js";
import { UserNestController } from "./userNestController.js";
import { LessonNestController } from "./lessonNestController.js";
import { SessionNestController } from "./sessionNestController.js";
import { ProgressNestController } from "./progressNestController.js";
import { PedagogicalNestController } from "./pedagogicalNestController.js";
import { DashboardNestController } from "./dashboardNestController.js";
import { HealthNestController } from "./healthNestController.js";
import { AuthGuard } from "./auth.guard.js";

export const NEST_CONTROLLERS = [
  HealthNestController,
  AuthNestController,
  UserNestController,
  LessonNestController,
  SessionNestController,
  ProgressNestController,
  PedagogicalNestController,
  DashboardNestController,
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
  providers.push(AuthGuard);
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
