import { onCLS, onFCP, onINP, onLCP } from 'web-vitals/attribution';

import type { WebTelemetryExtendedConfig, WebTelemetryTransport } from '../types.js';
import { sanitizeAttribution } from '../helpers.js';

import { WebTelemetryMonitoringWeb } from './WebTelemetryMonitoringWeb.js';
import { WebTelemetryWebApp } from './WebTelemetryWebApp.js';
import { WebTelemetryKV } from './WebTelemetryKV.js';
import { WebTelemetryResources } from './WebTelemetryResources.js';


type INPAttributionReportOpts = NonNullable<Parameters<typeof onINP>[1]> & {
    includeProcessedEventEntries: false;
};

export class WebTelemetryMonitoringWebAppWithWebVitals extends WebTelemetryMonitoringWeb {
    protected constructor(
        config: WebTelemetryExtendedConfig,
        transports?: Array<WebTelemetryTransport>,
        webAppInstance?: WebTelemetryWebApp,
        KVInstance?: WebTelemetryKV,
        resourcesInstance?: WebTelemetryResources,
    ) {
        super(config, transports, webAppInstance, KVInstance, resourcesInstance);
    }
    protected static override _instance: WebTelemetryMonitoringWebAppWithWebVitals;

    public startWebVitals() {
        [onLCP, onCLS, onFCP].forEach((getMetric) => {
            getMetric((metric) => this.KV.push({ key: metric.name, value: metric.value }, sanitizeAttribution(metric)));
        });

        const inpOpts: INPAttributionReportOpts = {
            includeProcessedEventEntries: false,
        };

        onINP(
            (metric) => this.KV.push({ key: metric.name, value: metric.value }, sanitizeAttribution(metric)),
            inpOpts,
        );
    }

    public static override Instance(
        config: WebTelemetryExtendedConfig,
        transports?: Array<WebTelemetryTransport>,
        webAppInstance?: WebTelemetryWebApp,
        KVInstance?: WebTelemetryKV,
        resourcesInstance?: WebTelemetryResources,
    ) {
        return this._instance || (this._instance = new WebTelemetryMonitoringWebAppWithWebVitals(
            config,
            transports,
            webAppInstance,
            KVInstance,
            resourcesInstance,));
    }
}
