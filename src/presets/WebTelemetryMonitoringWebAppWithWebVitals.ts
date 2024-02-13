import { WebTelemetryMonitoringWeb } from './WebTelemetryMonitoringWeb';
import { getLCP, getFID, getCLS, getFCP } from 'web-vitals';
import { WebTelemetryExtendedConfig } from '../types';

export class WebTelemetryMonitoringWebAppWithWebVitals extends WebTelemetryMonitoringWeb {
    protected constructor(config: WebTelemetryExtendedConfig) {
        super(config);
    }
    protected static _instance: WebTelemetryMonitoringWebAppWithWebVitals;

    public startWebVitals() {
        [getFCP, getLCP, getFID, getCLS].forEach((getMetric) => {
            getMetric(({ name, value }) => this.KV.push({ key: name, value: Math.round(value) }));
        });
    }

    public static Instance(config: WebTelemetryExtendedConfig) {
        return this._instance || (this._instance = new WebTelemetryMonitoringWebAppWithWebVitals(config));
    }
}
