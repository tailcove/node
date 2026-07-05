# @tailcove/node

Node.js client for shipping application logs to
[Tailcove](https://tailcove.com). Batches up to 50 lines (or 2 seconds,
whichever comes first) and ships them as NDJSON over `fetch`. A delivery
failure never throws into your application — it's dropped silently unless
you pass `onError`.

## Install

```bash
npm install @tailcove/node
```

## Quickstart

```ts
import { Tailcove } from '@tailcove/node';

const tailcove = new Tailcove({
    token: process.env.TAILCOVE_TOKEN!,
    endpoint: process.env.TAILCOVE_ENDPOINT, // defaults to https://ingest.tailcove.com/api/v1/logs
});

tailcove.info('user signed up', { userId: 42 });
tailcove.error('payment failed', { orderId: 99, reason: 'card_declined' });

// Optional: block until the current batch is sent, e.g. before a short-lived
// script exits. Long-running processes don't need this — beforeExit/SIGTERM
// flush automatically (see "Shutdown" below).
await tailcove.flush();
```

Level helpers: `debug`, `info`, `notice`, `warning`, `error`, `critical`,
`alert`, `emergency` — or call `log(level, message, context)` directly.

## Options

| Option | Default | Purpose |
|---|---|---|
| `token` | — | The source's ingest token. Required. |
| `endpoint` | `https://ingest.tailcove.com/api/v1/logs` | Your source's ingest URL. |
| `batchSize` | `50` | Flush once this many lines are buffered. |
| `batchIntervalMs` | `2000` | Flush once this many milliseconds have passed since the first buffered line, whichever comes first. |
| `timeoutMs` | `2000` | Milliseconds before a delivery attempt gives up. |
| `context` | `{}` | Merged into every line's context, underneath the per-call context. |
| `enabled` | `true` | Set `false` to keep the client silent — nothing is buffered or sent. |
| `onError` | — | Called with the error when a batch fails to send. Omit to drop failures silently. |
| `flushOnShutdown` | `true` | Set `false` to opt out of the automatic `beforeExit`/`SIGTERM` flush and call `flush()`/`shutdown()` yourself. |

## Context enrichment

Every line automatically gets, without any code changes on your end:

- `hostname` — `os.hostname()`
- `pid` — `process.pid`
- `env` — `process.env.NODE_ENV` (defaults to `development`)

Pass `context` in the constructor to merge additional fields (e.g. `service`,
`region`) onto every line; per-call context passed to `log()`/`info()`/etc.
wins on key collision.

## Shutdown

A Node process is long-lived, so `batchIntervalMs` is enforced with a real
timer rather than a lazy check on the next log call — the latency bound
holds even if nothing else triggers a flush. On top of that,
`flushOnShutdown` (on by default) flushes any buffered lines automatically
on `beforeExit` and `SIGTERM`, so a partial batch is never silently lost
when the process exits.

If you'd rather manage shutdown yourself (e.g. you already have your own
signal handling), construct with `flushOnShutdown: false` and call
`await tailcove.flush()` — or `await tailcove.shutdown()`, which flushes and
also unsubscribes the client from the shared shutdown listeners — at the
point in your own shutdown sequence where you're ready.

## Pino

```ts
import pino from 'pino';

const logger = pino({
    transport: {
        target: '@tailcove/node/pino',
        options: {
            token: process.env.TAILCOVE_TOKEN,
        },
    },
});

logger.error({ orderId: 99 }, 'payment failed');
```

Runs in pino's worker thread and owns its own `Tailcove` client. Pino's
numeric levels are mapped onto Tailcove's syslog-style set: `trace`/`debug`
→ `debug`, `info` → `info`, `warn` → `warning`, `error` → `error`, `fatal` →
`critical`.

## Winston

```ts
import winston from 'winston';
import { TailcoveTransport } from '@tailcove/node/winston';

const logger = winston.createLogger({
    transports: [
        new TailcoveTransport({ token: process.env.TAILCOVE_TOKEN }),
    ],
});

logger.warn('disk almost full', { volume: '/data' });
```

Winston's default npm levels are mapped as: `error` → `error`, `warn` →
`warning`, `info`/`http` → `info`, `verbose`/`debug`/`silly` → `debug`.

## Failure handling

A delivery failure — a network error or a non-2xx response — never throws
into your application. It's caught, handed to `onError` if you provided one,
and otherwise dropped. Logging is best-effort by design; it should never be
the reason your app crashes.

## Publishing (maintainers only)

This package ships from `packages/tailcove/node` under the `@tailcove` npm
org. It is **not** wired into this repo's own `package.json` or CI — it's
built and published by hand:

```bash
cd packages/tailcove/node
npm install
npm run typecheck
npm test
npm run build

npm version patch   # or minor / major
npm publish --access public
```

`npm publish` requires being logged in (`npm login`) as a member of the
`@tailcove` org. `--access public` is required the first time a new scoped
package is published under a free org; harmless to keep passing on every
release.
