import build from 'pino-abstract-transport';
import { Tailcove } from './client.js';
import { mapPinoLevel } from './pino-levels.js';
import type { TailcoveOptions } from './types.js';

export type TailcovePinoOptions = TailcoveOptions;

/**
 * Pino transport target: `pino({ transport: { target: '@tailcove/node/pino', options: { token } } })`.
 * Runs in pino's worker thread, so it owns its own `Tailcove` client rather
 * than sharing one with the main thread.
 *
 * Kept as this entry's only export (no named exports alongside it) — pino
 * loads transports via dynamic `import()` and calls the resolved default
 * directly, which breaks under bundlers' CJS interop once a default export
 * shares a module with named exports. Level-mapping helpers live in
 * `pino-levels.ts` instead.
 */
export default function tailcoveTransport(options: TailcovePinoOptions) {
    const client = new Tailcove(options);

    return build(
        async function (source) {
            for await (const chunk of source) {
                const { level, msg, time, hostname, pid, ...context } =
                    chunk as Record<string, unknown>;

                void time;
                void hostname;
                void pid;

                client.log(
                    mapPinoLevel(level),
                    typeof msg === 'string' ? msg : '',
                    context,
                );
            }
        },
        {
            close: async () => {
                await client.shutdown();
            },
        },
    );
}
