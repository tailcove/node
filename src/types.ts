/** Syslog-style levels, matching the set the ingest endpoint normalizes to (see the log-ingestion skill). Unrecognized strings fall back to `info`, same as the server. */
export type LogLevel =
    | 'debug'
    | 'info'
    | 'notice'
    | 'warning'
    | 'error'
    | 'critical'
    | 'alert'
    | 'emergency';

export const LOG_LEVELS: readonly LogLevel[] = [
    'debug',
    'info',
    'notice',
    'warning',
    'error',
    'critical',
    'alert',
    'emergency',
];

export type LogContext = Record<string, unknown>;

/** Wire shape sent to the ingest endpoint — one JSON object per NDJSON line. */
export interface LogLine {
    message: string;
    level: LogLevel;
    context: LogContext;
    host: string;
    ts: string;
}

export interface TailcoveOptions {
    /** The source's ingest token. */
    token: string;
    /** Defaults to `https://ingest.tailcove.dev/api/v1/logs`. */
    endpoint?: string;
    /** Flush once this many records are buffered. Defaults to 50. */
    batchSize?: number;
    /** Flush once this many milliseconds have passed since the first buffered record. Defaults to 2000. */
    batchIntervalMs?: number;
    /** Milliseconds before a delivery attempt gives up. Defaults to 2000. */
    timeoutMs?: number;
    /** Merged into every line's context, underneath the per-call context. */
    context?: LogContext;
    /** Set `false` to keep the client silent — nothing is buffered or sent. Defaults to `true`. */
    enabled?: boolean;
    /** Called when a batch fails to send. Errors are otherwise dropped silently. */
    onError?: (error: unknown) => void;
    /** Set `false` to opt out of the automatic `beforeExit`/`SIGTERM` flush and manage shutdown yourself via `flush()`. Defaults to `true`. */
    flushOnShutdown?: boolean;
}
