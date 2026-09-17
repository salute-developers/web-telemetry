import type { WebTelemetryExtendedConfig, WebTelemetryTransport } from '../types.js';
import { registerWebVitals } from '../registerWebVitals.js';

import { WebTelemetryMonitoringWeb } from './WebTelemetryMonitoringWeb.js';

export class WebTelemetryMonitoringWebAppWithWebVitals extends WebTelemetryMonitoringWeb {
    protected constructor(config: WebTelemetryExtendedConfig, transports?: Array<WebTelemetryTransport>) {
        super(config, transports);
    }
    protected static override _instance: WebTelemetryMonitoringWebAppWithWebVitals;

    public startWebVitals() {
        registerWebVitals(this.KV, 'webApp');
    }

    public static override Instance(config: WebTelemetryExtendedConfig, transports?: Array<WebTelemetryTransport>) {
        return this._instance || (this._instance = new WebTelemetryMonitoringWebAppWithWebVitals(config, transports));
    }
}
