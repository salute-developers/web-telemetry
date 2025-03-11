import { WebTelemetryBase } from '../WebTelemetryBase.js';

export class WebTelemetry<T> extends WebTelemetryBase<T, T> {
    protected payloadToJSON(payload: T): T {
        return payload;
    }
}
