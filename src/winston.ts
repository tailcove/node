import TransportStream from 'winston-transport';
import type {TransportStreamOptions} from 'winston-transport';
import { Tailcove } from './client.js';
import type { TailcoveOptions } from './types.js';
import { mapWinstonLevel } from './winston-levels.js';

export interface TailcoveWinstonTransportOptions
    extends TransportStreamOptions,
        TailcoveOptions {}

/**
 * Winston transport: `new winston.createLogger({ transports: [new TailcoveTransport({ token })] })`.
 */
export class TailcoveTransport extends TransportStream {
    private readonly client: Tailcove;

    constructor(options: TailcoveWinstonTransportOptions) {
        super(options);
        this.client = new Tailcove(options);
    }

    log(info: Record<string, unknown>, callback: () => void): void {
        setImmediate(() => this.emit('logged', info));

        const { level, message, ...context } = info;

        this.client.log(
            mapWinstonLevel(typeof level === 'string' ? level : 'info'),
            typeof message === 'string' ? message : String(message ?? ''),
            context,
        );

        callback();
    }

    flush(): Promise<void> {
        return this.client.flush();
    }

    close(): void {
        void this.client.shutdown();
    }
}
