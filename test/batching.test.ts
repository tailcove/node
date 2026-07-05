import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Tailcove } from '../src/client.js';
import { flushMicrotasks, linesFromCall, stubFetchOk } from './helpers.js';

describe('batching', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('flushes once batchSize is reached, before the interval elapses', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({
            token: 't',
            batchSize: 2,
            batchIntervalMs: 100_000,
            flushOnShutdown: false,
        });

        client.log('info', 'one');
        expect(fetchMock).not.toHaveBeenCalled();

        client.log('info', 'two');
        await flushMicrotasks();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const lines = linesFromCall(fetchMock);
        expect(lines).toHaveLength(2);
        expect(lines[0]).toMatchObject({ message: 'one', level: 'info' });
        expect(lines[1]).toMatchObject({ message: 'two', level: 'info' });
    });

    it('flushes after batchIntervalMs even if batchSize was never reached', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({
            token: 't',
            batchSize: 50,
            batchIntervalMs: 2_000,
            flushOnShutdown: false,
        });

        client.log('info', 'lonely line');
        expect(fetchMock).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(2_000);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(linesFromCall(fetchMock)).toHaveLength(1);
    });

    it('does not send a request while under both thresholds', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({
            token: 't',
            batchSize: 50,
            batchIntervalMs: 2_000,
            flushOnShutdown: false,
        });

        client.log('info', 'not yet');
        await vi.advanceTimersByTimeAsync(1_000);

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('flush() sends immediately regardless of thresholds', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({
            token: 't',
            batchSize: 50,
            batchIntervalMs: 100_000,
            flushOnShutdown: false,
        });

        client.log('info', 'first');
        await client.flush();

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('flush() is a no-op when nothing is buffered', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({ token: 't', flushOnShutdown: false });

        await client.flush();

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sends the token as a bearer header and the body as NDJSON', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({
            token: 'secret-token',
            endpoint: 'https://ingest.example.test/api/v1/logs',
            flushOnShutdown: false,
        });

        client.log('error', 'boom', { orderId: 42 });
        await client.flush();

        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://ingest.example.test/api/v1/logs');
        expect((init.headers as Record<string, string>).Authorization).toBe(
            'Bearer secret-token',
        );

        const [line] = linesFromCall(fetchMock) as Array<Record<string, unknown>>;
        expect(line.message).toBe('boom');
        expect(line.level).toBe('error');
        expect((line.context as Record<string, unknown>).orderId).toBe(42);
        expect(typeof line.host).toBe('string');
        expect(typeof line.ts).toBe('string');
    });

    it('merges static context, global context, and per-call context, with per-call winning', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({
            token: 't',
            context: { service: 'checkout', region: 'us-east' },
            flushOnShutdown: false,
        });

        client.log('info', 'hi', { region: 'eu-west' });
        await client.flush();

        const [line] = linesFromCall(fetchMock) as Array<Record<string, unknown>>;
        const context = line.context as Record<string, unknown>;
        expect(context.service).toBe('checkout');
        expect(context.region).toBe('eu-west');
        expect(typeof context.pid).toBe('number');
        expect(typeof context.hostname).toBe('string');
    });

    it('does nothing when enabled is false', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({
            token: 't',
            enabled: false,
            flushOnShutdown: false,
        });

        client.log('info', 'should be dropped');
        await client.flush();

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('normalizes an unrecognized level to info instead of throwing', async () => {
        const fetchMock = stubFetchOk();
        const client = new Tailcove({ token: 't', flushOnShutdown: false });

        // @ts-expect-error deliberately passing a level outside the LogLevel union
        client.log('trace', 'weird level');
        await client.flush();

        const [line] = linesFromCall(fetchMock) as Array<Record<string, unknown>>;
        expect(line.level).toBe('info');
    });
});
