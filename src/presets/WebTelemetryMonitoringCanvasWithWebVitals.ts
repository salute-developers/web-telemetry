import type { WebTelemetryAddon, WebTelemetryExtendedConfig, WebTelemetryTransport } from '../types.js';
import { registerWebVitals } from '../registerWebVitals.js';

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
        registerWebVitals(this.KV, 'canvas');
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
