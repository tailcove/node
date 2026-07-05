import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tailcove } from '../src/client.js';
import { flushMicrotasks, stubFetchOk } from './helpers.js';

describe('graceful shutdown', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('flushes a buffered batch on beforeExit', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({
            token: 't',
            batchSize: 50,
            batchIntervalMs: 100_000,
        });

        client.log('info', 'about to exit');
        expect(fetchMock).not.toHaveBeenCalled();

        process.emit('beforeExit', 0);
        await flushMicrotasks();

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not auto-flush when flushOnShutdown is false', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({
            token: 't',
            batchSize: 50,
            batchIntervalMs: 100_000,
            flushOnShutdown: false,
        });

        client.log('info', 'never auto-flushed');
        process.emit('beforeExit', 0);
        await flushMicrotasks();

        expect(fetchMock).not.toHaveBeenCalled();

        await client.flush();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('shutdown() flushes once and unregisters from future automatic flushes', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({
            token: 't',
            batchSize: 50,
            batchIntervalMs: 100_000,
        });

        client.log('info', 'first batch');
        await client.shutdown();
        expect(fetchMock).toHaveBeenCalledTimes(1);

        client.log('info', 'buffered after shutdown');
        process.emit('beforeExit', 0);
        await flushMicrotasks();

        // Still 1: shutdown() removed this client from the shared
        // beforeExit flush, so the line logged afterward is left buffered.
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('registers a SIGTERM listener for graceful shutdown', () => {
        new Tailcove({ token: 't' });

        expect(process.listenerCount('SIGTERM')).toBeGreaterThanOrEqual(1);
    });
});
