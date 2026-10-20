<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/packages/node-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/packages/node-light.svg">
  <img alt="@tailcove/node: Tailcove for Node.js" src="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/packages/node-dark.svg" width="100%">
</picture>

<p align="center">
  <a href="https://tailcove.dev/docs/sending-logs/node"><picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/btn-docs-dark.svg"><source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/btn-docs-light.svg"><img alt="Documentation" src="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/btn-docs-dark.svg" height="40"></picture></a>
  &nbsp;
  <a href="https://app.tailcove.dev/register"><picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/btn-start-dark.svg"><source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/btn-start-light.svg"><img alt="Get started free" src="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/btn-start-dark.svg" height="40"></picture></a>
  &nbsp;
  <a href="https://www.npmjs.com/package/@tailcove/node"><picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/btn-npm-dark.svg"><source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/btn-npm-light.svg"><img alt="View on npm" src="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/btn-npm-dark.svg" height="40"></picture></a>
  &nbsp;
  <a href="https://github.com/tailcove/node/issues/new/choose"><picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/btn-bug-dark.svg"><source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/btn-bug-light.svg"><img alt="Report a bug" src="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/btn-bug-dark.svg" height="40"></picture></a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/packages/stats-node-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/packages/stats-node-light.svg">
    <img alt="@tailcove/node at a glance" src="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/packages/stats-node-dark.svg">
  </picture>
</p>

<h3 align="center">Send logs from Node.js to Tailcove in two lines of code.</h3>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/packages/features-node-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/packages/features-node-light.svg">
  <img alt="@tailcove/node features" src="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/packages/features-node-dark.svg" width="100%">
</picture>

## Install

```bash
npm install @tailcove/node
```

Requires Node.js 18 or newer.

## Quick start

**1. Get a token.** Create a source in your [Tailcove dashboard](https://app.tailcove.dev) and copy its ingest token. It is shown only once, so save it somewhere safe (an environment variable is ideal).

**2. Send your first log.**

```ts
import { Tailcove } from '@tailcove/node';

const tailcove = new Tailcove({ token: process.env.TAILCOVE_TOKEN! });

tailcove.info('user signed up', { userId: 42 });
tailcove.error('payment failed', { orderId: 99, reason: 'card_declined' });
```

**3. Open Tailcove.** Your lines appear in search and live tail within a couple of seconds.

Level helpers are `debug`, `info`, `notice`, `warning`, `error`, `critical`, `alert` and `emergency`. You can also call `log(level, message, context)` directly.

> **Short-lived scripts:** a script that exits right after logging can call `await tailcove.flush()` to send what is buffered. Long-running servers do not need this. See [Shutdown](#shutdown).

## Options

| Option | Default | What it does |
|---|---|---|
| `token` | — | Your source's ingest token. **Required.** |
| `endpoint` | `https://ingest.tailcove.dev/api/v1/logs` | The ingest URL. Only change this if you self-host. |
| `batchSize` | `50` | Send once this many lines are buffered. |
| `batchIntervalMs` | `2000` | Send once this many milliseconds have passed since the first buffered line. |
| `timeoutMs` | `2000` | How long a delivery attempt may take before giving up. |
| `context` | `{}` | Fields added to every line. Per-call context wins if keys clash. |
| `enabled` | `true` | Set `false` to turn the client off. Nothing is buffered or sent. |
| `onError` | — | Called with the error when a batch fails to send. Without it, failures are dropped silently. |
| `flushOnShutdown` | `true` | Flush automatically on `beforeExit` and `SIGTERM`. Set `false` to handle shutdown yourself. |

## What gets added automatically

Every line is enriched with:

| Field | Value |
|---|---|
| `hostname` | `os.hostname()` |
| `pid` | `process.pid` |
| `env` | `process.env.NODE_ENV` (defaults to `development`) |

Add your own fields to every line with the `context` option, for example `service` or `region`.

## Pino

```ts
import pino from 'pino';

const logger = pino({
    transport: {
        target: '@tailcove/node/pino',
        options: { token: process.env.TAILCOVE_TOKEN },
    },
});

logger.error({ orderId: 99 }, 'payment failed');
```

The transport runs in pino's worker thread and keeps your existing logger. Pino levels map as: `trace` and `debug` → `debug`, `info` → `info`, `warn` → `warning`, `error` → `error`, `fatal` → `critical`.

## Winston

```ts
import winston from 'winston';
import { TailcoveTransport } from '@tailcove/node/winston';

const logger = winston.createLogger({
    transports: [new TailcoveTransport({ token: process.env.TAILCOVE_TOKEN })],
});

logger.warn('disk almost full', { volume: '/data' });
```

Winston levels map as: `error` → `error`, `warn` → `warning`, `info` and `http` → `info`, `verbose`, `debug` and `silly` → `debug`.

## Shutdown

A real timer enforces `batchIntervalMs`, so lines are sent on time even when nothing else is logging. When the process ends, `beforeExit` and `SIGTERM` flush whatever is left, so a partial batch is not lost.

If you already manage your own shutdown, create the client with `flushOnShutdown: false`, then call `await tailcove.flush()`, or `await tailcove.shutdown()` to flush and detach, at the right point in your sequence.

## When delivery fails

Network errors and non-2xx responses never throw into your code. They are passed to `onError` if you set one, and dropped otherwise. Logging is best-effort by design.

```ts
const tailcove = new Tailcove({
    token: process.env.TAILCOVE_TOKEN!,
    onError: (error) => console.warn('Tailcove delivery failed', error),
});
```

## Help and feedback

- **Docs:** [tailcove.dev/docs/sending-logs/node](https://tailcove.dev/docs/sending-logs/node)
- **Bugs and feature requests:** [open an issue](https://github.com/tailcove/node/issues/new/choose)
- **Security problems:** please email **security@tailcove.dev** instead of opening a public issue.

<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/packages/footer-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/packages/footer-light.svg">
  <img alt="Tailcove. Built by AKCybex." src="https://raw.githubusercontent.com/tailcove/.github/main/profile/assets/packages/footer-dark.svg" width="100%">
</picture>

<p align="center">
  <a href="https://tailcove.dev/docs/sending-logs/node">Documentation</a> &nbsp;·&nbsp;
  <a href="https://app.tailcove.dev/register">Get started free</a> &nbsp;·&nbsp;
  <a href="https://github.com/tailcove/node/issues/new/choose">Report a bug</a> &nbsp;·&nbsp;
  <a href="LICENSE">MIT License</a>
</p>

<p align="center">
  <sub>More Tailcove libraries: <a href="https://github.com/tailcove/laravel">Laravel</a> &nbsp;·&nbsp; <a href="https://github.com/tailcove/python">Python</a> &nbsp;·&nbsp; <a href="https://github.com/tailcove/browser">Browser</a></sub>
</p>
