export interface WebTelemetryTransport {
    send(body: string): void;
}

export const SALUTE_EYE_URL = 'https://cbdv.sberdevices.ru/amplitude/telemetry/';
const SALUTE_EYE_API_KEY = '68bfaed5a9b7c036c54cb6a217df1b84';

function getLastPartAfterSlash(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1];
}

export class WebTelemetryTransportDefault implements WebTelemetryTransport {
    private url: string;

    constructor(url: string) {
        this.url = url;
    }

    send(body: string) {
        const headers = {
            'Content-Type': 'application/json',
            'X-API-KEY': SALUTE_EYE_API_KEY,
        };

        if (navigator.sendBeacon) {
            navigator.sendBeacon(this.url, body);
            const blob = new Blob([body], { type: headers['Content-Type'] });

            navigator.sendBeacon(SALUTE_EYE_URL + getLastPartAfterSlash(this.url), blob);
        } else {
            fetch(this.url, { body, method: 'POST' });
            fetch(SALUTE_EYE_URL + getLastPartAfterSlash(this.url), {
                method: 'POST',
                headers: headers,
                body: body,
            });
        }
    }
}
