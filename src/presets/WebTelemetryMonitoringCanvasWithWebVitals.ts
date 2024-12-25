import { WebTelemetryMonitoringCanvas } from './WebTelemetryMonitoringCanvas';
import { onLCP, onFID, onCLS, onFCP, onINP } from 'web-vitals';
import { WebTelemetryAddon, WebTelemetryExtendedConfig, WebTelemetryTransport } from '../types';

export class WebTelemetryMonitoringCanvasWithWebVitals extends WebTelemetryMonitoringCanvas {
    protected constructor(config: WebTelemetryExtendedConfig, transports?: Array<WebTelemetryTransport>, addons: Array<WebTelemetryAddon> = []) {
        super(config, transports, addons);
    }
    protected static _instance: WebTelemetryMonitoringCanvasWithWebVitals;

    public startWebVitals() {
        [onLCP, onFID, onCLS, onFCP, onINP].forEach((getMetric) => {
            getMetric(({ name, value }) => this.KV.push({ key: name, value: Math.round(value) }));
        });
    }

    public static Instance(config: WebTelemetryExtendedConfig, transports?: Array<WebTelemetryTransport>, addons: Array<WebTelemetryAddon> = []) {
        return this._instance || (this._instance = new WebTelemetryMonitoringCanvasWithWebVitals(config, transports, addons));
    }
}
