import { afterEach, describe, expect, it, vi } from 'vitest';
import { mapWinstonLevel } from '../src/winston-levels.js';
import { TailcoveTransport } from '../src/winston.js';
import { flushMicrotasks, linesFromCall, stubFetchOk } from './helpers.js';

describe('mapWinstonLevel', () => {
    it.each([
        ['error', 'error'],
        ['warn', 'warning'],
        ['info', 'info'],
        ['http', 'info'],
        ['verbose', 'debug'],
        ['debug', 'debug'],
        ['silly', 'debug'],
    ] as const)('maps winston level %s to %s', (winstonLevel, expected) => {
        expect(mapWinstonLevel(winstonLevel)).toBe(expected);
    });

    it('falls back to info for an unrecognized level', () => {
        expect(mapWinstonLevel('nonsense')).toBe('info');
    });
});

describe('winston transport wiring', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('forwards winston log info objects to the ingest endpoint with mapped levels', async () => {
        const fetchMock = stubFetchOk();
        const transport = new TailcoveTransport({
            token: 't',
            batchSize: 50,
            batchIntervalMs: 100_000,
            flushOnShutdown: false,
        });

        const callback = vi.fn();
        transport.log(
            { level: 'warn', message: 'disk almost full', orderId: 7 },
            callback,
        );

        expect(callback).toHaveBeenCalled();

        await transport.flush();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [line] = linesFromCall(fetchMock) as Array<Record<string, unknown>>;
        expect(line.message).toBe('disk almost full');
        expect(line.level).toBe('warning');
        expect((line.context as Record<string, unknown>).orderId).toBe(7);
    });
});
