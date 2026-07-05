import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tailcove } from '../src/client.js';
import { flushMicrotasks, stubFetchRejecting } from './helpers.js';

describe('never throws', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('flush() resolves (does not reject) when the network call fails', async () => {
        stubFetchRejecting(new Error('network is down'));
        const client = new Tailcove({ token: 't', flushOnShutdown: false });

        client.log('error', 'will fail to send');

        await expect(client.flush()).resolves.toBeUndefined();
    });

    it('reports delivery failures through onError, silently otherwise', async () => {
        const error = new Error('network is down');
        stubFetchRejecting(error);
        const onError = vi.fn();
        const client = new Tailcove({
            token: 't',
            onError,
            flushOnShutdown: false,
        });

        client.log('error', 'oops');
        await client.flush();

        expect(onError).toHaveBeenCalledWith(error);
    });

    it('never throws even if onError itself throws', async () => {
        stubFetchRejecting(new Error('network is down'));
        const client = new Tailcove({
            token: 't',
            onError: () => {
                throw new Error('onError blew up');
            },
            flushOnShutdown: false,
        });

        client.log('error', 'oops');

        await expect(client.flush()).resolves.toBeUndefined();
    });

    it('a non-2xx response is treated as a failure, not a thrown exception out of log()/flush()', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response(null, { status: 500 })),
        );
        const onError = vi.fn();
        const client = new Tailcove({
            token: 't',
            onError,
            flushOnShutdown: false,
        });

        client.log('error', 'server hiccup');
        await client.flush();

        expect(onError).toHaveBeenCalledTimes(1);
        expect((onError.mock.calls[0][0] as Error).message).toContain('500');
    });

    it('log() never throws synchronously even under a broken context object', () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 202 })));
        const client = new Tailcove({ token: 't', flushOnShutdown: false });

        const cyclical: Record<string, unknown> = {};
        cyclical.self = cyclical;

        expect(() => client.log('info', 'circular context', cyclical)).not.toThrow();
    });

    it('flush() resolves even when the context cannot be JSON-serialized', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 202 })));
        const onError = vi.fn();
        const client = new Tailcove({
            token: 't',
            onError,
            flushOnShutdown: false,
        });

        const cyclical: Record<string, unknown> = {};
        cyclical.self = cyclical;
        client.log('info', 'circular context', cyclical);

        await expect(client.flush()).resolves.toBeUndefined();
        expect(onError).toHaveBeenCalledTimes(1);
    });
});
