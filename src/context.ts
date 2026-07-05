import { hostname as osHostname } from 'node:os';
import type { LogContext } from './types.js';

/** Automatic per-process enrichment: hostname, pid, and the running env. Computed once per client, not per line — none of these change between log calls. */
export function baseContext(): LogContext {
    return {
        hostname: osHostname(),
        pid: process.pid,
        env: process.env.NODE_ENV ?? 'development',
    };
}
