import { vi } from 'vitest';

type FetchMock = ReturnType<
    typeof vi.fn<(input: string, init: RequestInit) => Promise<Response>>
>;

export function stubFetchOk(): FetchMock {
    const fetchMock: FetchMock = vi.fn(
        async () => new Response(null, { status: 202 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    return fetchMock;
}

export function stubFetchRejecting(error: unknown): FetchMock {
    const fetchMock: FetchMock = vi.fn(async () => {
        throw error;
    });
    vi.stubGlobal('fetch', fetchMock);

    return fetchMock;
}

/** Lets already-queued microtasks (promise chains inside flush()) settle before assertions run. */
export async function flushMicrotasks(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

/** Parses the NDJSON body handed to a mocked fetch call into one object per line. */
export function linesFromCall(fetchMock: FetchMock, callIndex = 0): unknown[] {
    const [, init] = fetchMock.mock.calls[callIndex];
    const body = init.body as string;

    return body
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
}
