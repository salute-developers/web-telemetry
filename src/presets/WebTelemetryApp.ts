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
        if (!this.addons.length) {
            this.callTransport({});
            return;
        }

        Promise.all(this.addons.map((addon) => Promise.all([addon.data(), addon.metadata()])))
            .then((results) => {
                results.forEach(([dataResult, metadataResult]) => {
                    this.mainEvent = { ...dataResult, ...this.mainEvent };
                    this.metaData = { ...metadataResult, ...this.metaData };
                });

                const event = {
                    ...this.mainEvent,
                    metadata: stringifyCircularObj(this.metaData),
                };

                this.callTransport(event);
            })
            .catch((error) => {
                console.error('Error in sendHandler:', error);
                this.callTransport({
                    ...this.mainEvent,
                    error: 'Failed to process addons',
                    metadata: stringifyCircularObj(this.metaData),
                });
            });
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
