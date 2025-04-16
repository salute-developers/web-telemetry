import { onCLS, onFCP, onFID, onINP, onLCP } from 'web-vitals/attribution';

import type { WebTelemetryExtendedConfig, WebTelemetryTransport } from '../types.js';

import { WebTelemetryMonitoringWeb } from './WebTelemetryMonitoringWeb.js';

export class WebTelemetryMonitoringWebAppWithWebVitals extends WebTelemetryMonitoringWeb {
    protected constructor(config: WebTelemetryExtendedConfig, transports?: Array<WebTelemetryTransport>) {
        super(config, transports);
    }
    protected static override _instance: WebTelemetryMonitoringWebAppWithWebVitals;

    public startWebVitals() {
        [onLCP, onFID, onCLS, onFCP, onINP].forEach((getMetric) => {
            getMetric(({ name, value, attribution }) => this.KV.push({ key: name, value: value }, attribution));
        });
    }

    public static override Instance(config: WebTelemetryExtendedConfig, transports?: Array<WebTelemetryTransport>) {
        return this._instance || (this._instance = new WebTelemetryMonitoringWebAppWithWebVitals(config, transports));
    }
}
