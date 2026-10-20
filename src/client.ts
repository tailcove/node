import { baseContext } from './context.js';
import { normalizeLevel } from './levels.js';
import { registerForShutdown, unregisterForShutdown } from './shutdown.js';
import { sendBatch } from './transport.js';
import type { LogContext, LogLevel, LogLine, TailcoveOptions } from './types.js';

const DEFAULT_ENDPOINT = 'https://ingest.tailcove.dev/api/v1/logs';
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_BATCH_INTERVAL_MS = 2000;
const DEFAULT_TIMEOUT_MS = 2000;

/**
 * Batches log lines in memory and ships them as NDJSON to a Tailcove
 * source's ingest endpoint — up to `batchSize` lines or `batchIntervalMs`,
 * whichever comes first, same thresholds as the `tailcove/laravel` package.
 * Unlike that package's per-request shutdown-function flush, a Node
 * process is long-lived, so a real timer guarantees the latency bound
 * even when nothing else triggers a flush; `flushOnShutdown` (on by
 * default) additionally flushes on `beforeExit`/`SIGTERM` so a buffered
 * partial batch is never silently lost when the process exits.
 *
 * Never throws: every public method swallows its own failures and reports
 * them to `onError` if one was given, otherwise drops them silently.
 */
export class Tailcove {
    private readonly endpoint: string;
    private readonly token: string;
    private readonly batchSize: number;
    private readonly batchIntervalMs: number;
    private readonly timeoutMs: number;
    private readonly globalContext: LogContext;
    private readonly enabled: boolean;
    private readonly onError?: (error: unknown) => void;
    private readonly staticContext: LogContext;

    private buffer: LogLine[] = [];
    private timer: NodeJS.Timeout | null = null;

    constructor(options: TailcoveOptions) {
        this.endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
        this.token = options.token;
        this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
        this.batchIntervalMs =
            options.batchIntervalMs ?? DEFAULT_BATCH_INTERVAL_MS;
        this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        this.globalContext = options.context ?? {};
        this.enabled = options.enabled ?? true;
        this.onError = options.onError;
        this.staticContext = baseContext();

        if (options.flushOnShutdown ?? true) {
            registerForShutdown(this);
        }
    }

    log(level: LogLevel, message: string, context: LogContext = {}): void {
        if (!this.enabled) {
            return;
        }

        try {
            this.buffer.push({
                message,
                level: normalizeLevel(level),
                context: {
                    ...this.staticContext,
                    ...this.globalContext,
                    ...context,
                },
                host: this.staticContext.hostname as string,
                ts: new Date().toISOString(),
            });

            if (this.buffer.length === 1) {
                this.scheduleFlush();
            }

            if (this.buffer.length >= this.batchSize) {
                void this.flush();
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    debug(message: string, context?: LogContext): void {
        this.log('debug', message, context);
    }

    info(message: string, context?: LogContext): void {
        this.log('info', message, context);
    }

    notice(message: string, context?: LogContext): void {
        this.log('notice', message, context);
    }

    warning(message: string, context?: LogContext): void {
        this.log('warning', message, context);
    }

    error(message: string, context?: LogContext): void {
        this.log('error', message, context);
    }

    critical(message: string, context?: LogContext): void {
        this.log('critical', message, context);
    }

    alert(message: string, context?: LogContext): void {
        this.log('alert', message, context);
    }

    emergency(message: string, context?: LogContext): void {
        this.log('emergency', message, context);
    }

    /** Sends whatever is buffered right now, regardless of size or age. Safe to call directly (e.g. before a worker process exits). Never throws. */
    async flush(): Promise<void> {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        if (this.buffer.length === 0) {
            return;
        }

        const batch = this.buffer;
        this.buffer = [];

        try {
            await sendBatch(this.endpoint, this.token, batch, this.timeoutMs);
        } catch (error) {
            this.handleError(error);
        }
    }

    /** Flushes and stops participating in the shared `beforeExit`/`SIGTERM` flush. Call this if you're managing shutdown yourself. */
    async shutdown(): Promise<void> {
        await this.flush();
        unregisterForShutdown(this);
    }

    private scheduleFlush(): void {
        if (this.timer) {
            return;
        }

        const timer = setTimeout(() => {
            void this.flush();
        }, this.batchIntervalMs);

        timer.unref?.();
        this.timer = timer;
    }

    private handleError(error: unknown): void {
        try {
            this.onError?.(error);
        } catch {
            // onError itself must never be able to throw back into the caller.
        }
    }
}
