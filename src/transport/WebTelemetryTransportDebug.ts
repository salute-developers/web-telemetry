import { WebTelemetryTransport } from '../types';

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
