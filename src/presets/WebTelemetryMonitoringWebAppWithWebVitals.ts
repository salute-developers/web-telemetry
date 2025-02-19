import { onLCP, onFID, onCLS, onFCP, onINP } from 'web-vitals/attribution';

import { WebTelemetryExtendedConfig, WebTelemetryTransport } from '../types';

import { WebTelemetryMonitoringWeb } from './WebTelemetryMonitoringWeb';

export class WebTelemetryMonitoringWebAppWithWebVitals extends WebTelemetryMonitoringWeb {
    protected constructor(config: WebTelemetryExtendedConfig, transports?: Array<WebTelemetryTransport>) {
        super(config, transports);
    }
    protected static _instance: WebTelemetryMonitoringWebAppWithWebVitals;

    public startWebVitals() {
        [onLCP, onFID, onCLS, onFCP, onINP].forEach((getMetric) => {
            getMetric(({ name, value, attribution }) =>
                this.KV.push({ key: name, value: Math.round(value) }, attribution),
            );
        });
    }

    public static Instance(config: WebTelemetryExtendedConfig, transports?: Array<WebTelemetryTransport>) {
        return this._instance || (this._instance = new WebTelemetryMonitoringWebAppWithWebVitals(config, transports));
    }
}
