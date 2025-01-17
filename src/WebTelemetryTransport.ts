export interface WebTelemetryTransport {
    send(body: string): void;
}

export const SALUTE_EYE_URL = 'https://clickbeat.sberdevices.ru/amplitude/telemetry';

export class WebTelemetryTransportDefault implements WebTelemetryTransport {
    private url: string;

    constructor(url: string) {
        this.url = url;
    }

    send(body: string) {
        if (navigator.sendBeacon) {
            navigator.sendBeacon(this.url, body);
        } else {
            fetch(this.url, { body, method: 'POST' });
        }
    }
}

export class WebTelemetryTransportDebug implements WebTelemetryTransport {
    send(body: string) {
        try {
            // eslint-disable-next-line no-console
            console.debug('WebTelemetry sent:\n', JSON.parse(body));
        } catch {
            // eslint-disable-next-line no-console
            console.debug(`WebTelemetry sent:\n${body}`);
        }
    }
}
