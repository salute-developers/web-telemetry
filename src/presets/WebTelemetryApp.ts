import { globalSessionId } from '../constants.js';
import { stringifyCircularObj } from '../helpers.js';
import type {
    WebTelemetryAddon,
    WebTelemetryBaseEvent,
    WebTelemetryConfig,
    WebTelemetryTransport,
    WebTelemetryValue,
} from '../types.js';
import { WebTelemetryBase } from '../WebTelemetryBase.js';

type WebTelemetryAppEvent = Record<string, WebTelemetryValue>;

export class WebTelemetryApp extends WebTelemetryBase<WebTelemetryAppEvent, WebTelemetryAppEvent> {
    private dataHasBeenSend: boolean;

    private mainEvent: Record<string, WebTelemetryValue>;

    private metaData: Record<string, any>;

    constructor(
        config: WebTelemetryConfig,
        addons: Array<WebTelemetryAddon> = [],
        transports?: Array<WebTelemetryTransport>,
    ) {
        super(config, addons, transports);

        this.dataHasBeenSend = false;
        this.metaData = {};
        this.mainEvent = {
            sessionId: globalSessionId,
        };
    }

    protected payloadToJSON(payload: WebTelemetryAppEvent): WebTelemetryAppEvent {
        return payload;
    }

    protected override sendHandler() {
        for (const addon of this.addons) {
            const data = addon.data();
            const metadata = addon.metadata();
            this.mainEvent = Object.assign({}, data, this.mainEvent);
            this.metaData = Object.assign({}, metadata, this.metaData);
        }

        const event = {
            ...this.mainEvent,
            metadata: stringifyCircularObj(this.metaData),
        };

        this.callTransport(event);
    }

    public override push(): WebTelemetryBaseEvent {
        throw new Error('Not implemented for "WebTelemetryApp"');
    }

    public setMetric(name: string, value: WebTelemetryValue) {
        this.mainEvent[name] = value;
    }

    public setMetadata(name: string, value: any) {
        this.metaData[name] = value;
    }

    public send() {
        if (this.config.disabled) {
            return;
        }

        if (this.dataHasBeenSend) {
            return;
        }

        this.scheduleSend();
        this.dataHasBeenSend = true;
    }
}
