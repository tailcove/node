export interface Flushable {
    flush(): Promise<void>;
}

const instances = new Set<Flushable>();

let listenersRegistered = false;

/**
 * Registers a client for the shared `beforeExit`/`SIGTERM` flush. Process
 * listeners are added once per process, not once per client — otherwise a
 * host app creating many `Tailcove` instances (e.g. one per test) would
 * trip Node's max-listeners warning.
 */
export function registerForShutdown(client: Flushable): void {
    instances.add(client);
    ensureListeners();
}

export function unregisterForShutdown(client: Flushable): void {
    instances.delete(client);
}

function ensureListeners(): void {
    if (listenersRegistered) {
        return;
    }

    listenersRegistered = true;

    process.on('beforeExit', () => {
        void flushAll();
    });

    process.on('SIGTERM', () => {
        void flushAll().finally(() => process.exit(0));
    });
}

function flushAll(): Promise<void> {
    return Promise.all([...instances].map((client) => client.flush())).then(
        () => undefined,
    );
}
