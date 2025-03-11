import { AddonInfo } from '../extra/AddonInfo.js';
import type { WebTelemetryAddon, WebTelemetryConfig, WebTelemetryTransport, WebTelemetryValue } from '../types.js';
import { WebTelemetryBase } from '../WebTelemetryBase.js';

interface WebTelemetryKVPayload {
    key: string;
    value: WebTelemetryValue;
}

interface WebTelemetryKVResult {
    key: string;
    valueNum?: number;
    valueBool?: boolean;
    valueStr?: string;
}

type WebTelemetrySpanHandler = (name: string, delta: number) => void;

class WebTelemetrySpan {
    private timeStart = 0;

    private name: string;

    private done: boolean;

    private handler: WebTelemetrySpanHandler;

    constructor(name: string, handler: WebTelemetrySpanHandler) {
        this.name = name;
        this.done = false;
        this.timeStart = Math.round(performance.now());
        this.handler = handler;
    }

    end() {
        if (this.done) {
            return;
        }

        const timeEnd = Math.round(performance.now());
        const delta = timeEnd - this.timeStart;
        this.done = true;

        this.handler(this.name, delta);

        return delta;
    }
}

const noop = () => undefined;

export class WebTelemetryKV extends WebTelemetryBase<WebTelemetryKVPayload, WebTelemetryKVResult> {
    constructor(config: WebTelemetryConfig, transports?: Array<WebTelemetryTransport>) {
        const addons: Array<WebTelemetryAddon> = [new AddonInfo()];
        super(config, addons, transports);
    }

    protected payloadToJSON(payload: WebTelemetryKVPayload): WebTelemetryKVResult {
        const { key, value } = payload;

        switch (typeof value) {
            case 'string':
                return { key, valueStr: value };

            case 'number':
                return { key, valueNum: value };

            case 'boolean':
                return { key, valueBool: value };

            default:
                return { key };
        }
    }

    /**
     * Создает сущность класса `WebTelemetrySpan`.
     * После вызова WebTelemetrySpan.end() в очередь будет
     * добавлено событие, ключом которого будет `spanName`,
     * а значением время, прошедшее с момент вызова `createSpan`
     */
    public createSpan<M>(spanName: string, meta?: M) {
        const span = new WebTelemetrySpan(
            spanName,
            this.config.disabled ? noop : (_, delta) => this.push({ key: spanName, value: delta }, meta),
        );

        return span;
    }
}
