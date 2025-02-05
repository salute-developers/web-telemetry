import { globalSessionId } from '../constants';
import { stringifyCircularObj } from '../helpers';
import {
    WebTelemetryAddon,
    WebTelemetryBaseEvent,
    WebTelemetryConfig,
    WebTelemetryTransport,
    WebTelemetryValue,
} from '../types';
import { WebTelemetryBase } from '../WebTelemetryBase';

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

    protected sendHandler() {
        let counter = 0;
        const totalAddons = this.addons.length;

        if (!totalAddons) {
            this.callTransport({});
        }

        for (const addon of this.addons) {
            Promise.all([addon.data(), addon.metadata()]).then((results) => {
                counter++;

                const [dataResult, metadataResult] = results;
                this.mainEvent = Object.assign({}, dataResult, this.mainEvent);
                this.metaData = Object.assign({}, metadataResult, this.metaData);

                if (counter === totalAddons) {
                    const event = {
                        ...this.mainEvent,
                        metadata: stringifyCircularObj(this.metaData),
                    };

                    this.callTransport(event);
                }
            });
        }
    }

    public push(): WebTelemetryBaseEvent {
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
