import { onLCP, onFID, onCLS, onFCP, onINP } from 'web-vitals/attribution';

import type { WebTelemetryAddon, WebTelemetryExtendedConfig, WebTelemetryTransport } from '../types.js';

import { WebTelemetryMonitoringCanvas } from './WebTelemetryMonitoringCanvas.js';

export class WebTelemetryMonitoringCanvasWithWebVitals extends WebTelemetryMonitoringCanvas {
    protected constructor(
        config: WebTelemetryExtendedConfig,
        transports?: Array<WebTelemetryTransport>,
        addons: Array<WebTelemetryAddon> = [],
    ) {
        super(config, transports, addons);
    }
    protected static override _instance: WebTelemetryMonitoringCanvasWithWebVitals;

    public startWebVitals() {
        [onLCP, onFID, onCLS, onFCP, onINP].forEach((getMetric) => {
            getMetric(({ name, value, attribution }) =>
                this.KV.push({ key: name, value: Math.round(value) }, attribution),
            );
        });
    }

    public static override Instance(
        config: WebTelemetryExtendedConfig,
        transports?: Array<WebTelemetryTransport>,
        addons: Array<WebTelemetryAddon> = [],
    ) {
        return (
            this._instance ||
            (this._instance = new WebTelemetryMonitoringCanvasWithWebVitals(config, transports, addons))
        );
    }
}
