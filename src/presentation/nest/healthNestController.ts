import { Controller, Get } from '@nestjs/common';

interface HealthResponse {
  status: 'ok';
  timestamp: string;
}

@Controller('/health')
export class HealthNestController {
  @Get()
  health(): HealthResponse {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}