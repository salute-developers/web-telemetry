export interface WebTelemetryTransport {
    send(body: string): void;
}

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

export class WebTelemetryTransportJson implements WebTelemetryTransport {
    private url: string;

    constructor(url: string) {
        this.url = url;
    }

    send(body: string) {
        if (navigator.sendBeacon) {
            const blob = new Blob([body], { type: 'application/json' });
            navigator.sendBeacon(this.url, blob);
        } else {
            fetch(this.url, {
                body,
                method: 'POST',
                headers: {
                    'Content-type': 'application/json',
                },
            });
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
