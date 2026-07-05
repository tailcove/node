import { afterEach, describe, expect, it, vi } from 'vitest';
import { mapPinoLevel } from '../src/pino-levels.js';
import tailcoveTransport from '../src/pino.js';
import { flushMicrotasks, linesFromCall, stubFetchOk } from './helpers.js';

describe('mapPinoLevel', () => {
    it.each([
        [10, 'debug'],
        [20, 'debug'],
        [30, 'info'],
        [40, 'warning'],
        [50, 'error'],
        [60, 'critical'],
    ] as const)('maps pino level %d to %s', (pinoLevel, expected) => {
        expect(mapPinoLevel(pinoLevel)).toBe(expected);
    });

    it('falls back to info for an unrecognized level', () => {
        expect(mapPinoLevel(999)).toBe('info');
        expect(mapPinoLevel(undefined)).toBe('info');
    });
});

describe('pino transport wiring', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('forwards parsed pino log lines to the ingest endpoint with mapped levels', async () => {
        const fetchMock = stubFetchOk();
        const stream = tailcoveTransport({
            token: 't',
            batchSize: 50,
            batchIntervalMs: 100_000,
            flushOnShutdown: false,
        });

        stream.write(
            JSON.stringify({
                level: 50,
                msg: 'db connection lost',
                time: Date.now(),
                hostname: 'ignored-by-tailcove',
                pid: 1234,
                orderId: 99,
            }) + '\n',
        );

        await new Promise<void>((resolve) => stream.end(resolve));
        await flushMicrotasks();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [line] = linesFromCall(fetchMock) as Array<Record<string, unknown>>;
        expect(line.message).toBe('db connection lost');
        expect(line.level).toBe('error');
        expect((line.context as Record<string, unknown>).orderId).toBe(99);
    });
});
