import type { LogLevel } from './types.js';

/** Pino's numeric levels (trace=10 … fatal=60) mapped onto Tailcove's syslog-style set. `fatal` maps to `critical` rather than `emergency`, which we reserve for infrastructure-wide outages a single process can't declare on its own. */
export const PINO_LEVEL_TO_TAILCOVE: Record<number, LogLevel> = {
    10: 'debug', // trace
    20: 'debug', // debug
    30: 'info', // info
    40: 'warning', // warn
    50: 'error', // error
    60: 'critical', // fatal
};

export function mapPinoLevel(level: unknown): LogLevel {
    if (typeof level === 'number' && level in PINO_LEVEL_TO_TAILCOVE) {
        return PINO_LEVEL_TO_TAILCOVE[level];
    }

    return 'info';
}
