import type { LogLevel } from './types.js';

/** Winston's default npm levels (error=0 … silly=6) mapped onto Tailcove's syslog-style set. `http` and `verbose` don't have direct equivalents, so they fold into the nearest neighbor (`info` and `debug` respectively). */
export const WINSTON_LEVEL_TO_TAILCOVE: Record<string, LogLevel> = {
    error: 'error',
    warn: 'warning',
    info: 'info',
    http: 'info',
    verbose: 'debug',
    debug: 'debug',
    silly: 'debug',
};

export function mapWinstonLevel(level: string): LogLevel {
    return WINSTON_LEVEL_TO_TAILCOVE[level] ?? 'info';
}
