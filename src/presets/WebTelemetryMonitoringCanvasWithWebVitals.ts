import { WebTelemetryMonitoringCanvas } from './WebTelemetryMonitoringCanvas';
import { getLCP, getFID, getCLS, getFCP } from 'web-vitals';
import { WebTelemetryAddon, WebTelemetryExtendedConfig } from '../types';

export class WebTelemetryMonitoringCanvasWithWebVitals extends WebTelemetryMonitoringCanvas {
    protected constructor(config: WebTelemetryExtendedConfig, addons: Array<WebTelemetryAddon> = []) {
        super(config, addons);
    }
    protected static _instance: WebTelemetryMonitoringCanvasWithWebVitals;

    public startWebVitals() {
        [getFCP, getLCP, getFID, getCLS].forEach((getMetric) => {
            getMetric(({ name, value }) => this.KV.push({ key: name, value: Math.round(value) }));
        });
    }

    public static Instance(config: WebTelemetryExtendedConfig, addons: Array<WebTelemetryAddon> = []) {
        return this._instance || (this._instance = new WebTelemetryMonitoringCanvasWithWebVitals(config, addons));
    }
}
