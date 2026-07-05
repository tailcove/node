import type { LogLine } from './types.js';

/**
 * Ships a batch as NDJSON — one JSON object per line, per the ingest
 * endpoint's payload sniffing (see the log-ingestion skill). Throws on a
 * network failure or non-2xx response; callers decide whether that's
 * swallowed or reported via `onError`.
 */
export async function sendBatch(
    endpoint: string,
    token: string,
    batch: readonly LogLine[],
    timeoutMs: number,
): Promise<void> {
    const body = batch.map((line) => JSON.stringify(line)).join('\n');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-ndjson',
                Authorization: `Bearer ${token}`,
            },
            body,
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(
                `tailcove: ingest endpoint responded with status ${response.status}`,
            );
        }
    } finally {
        clearTimeout(timeout);
    }
}
