export interface WebTelemetryTransport {
    send(body: string): void;
}

export class WebTelemetryTransportDefault implements WebTelemetryTransport {
    protected url: string;

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
            console.debug('WebTelemetry sent:\n', JSON.parse(body));
        } catch {
            console.debug(`WebTelemetry sent:\n${body}`);
        }
    }
}
