import pino, { type LoggerOptions, type TransportSingleOptions } from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

const transport: TransportSingleOptions | undefined = isDevelopment
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    }
  : undefined;

const options: LoggerOptions = {
  level: isDevelopment ? 'debug' : 'info',
  base: {
    service: 'opentype-tutor',
  },
};

if (transport) {
  options.transport = transport;
}

export const logger = pino(options);

export const createChildLogger = (bindings: Record<string, unknown>) => {
  return logger.child(bindings);
};