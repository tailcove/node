import { LOG_LEVELS  } from './types.js';
import type {LogLevel} from './types.js';

const KNOWN_LEVELS = new Set<string>(LOG_LEVELS);

/** Lowercases and validates a level string, defaulting to `info` for anything unrecognized — mirrors the ingest endpoint's own fallback (see the log-ingestion skill), so a bad level never becomes a thrown error. */
export function normalizeLevel(level: string): LogLevel {
    const lowered = level.toLowerCase();

    return KNOWN_LEVELS.has(lowered) ? (lowered as LogLevel) : 'info';
}
