import { onCLS, onFCP, onINP, onLCP } from 'web-vitals/attribution';

import { sanitizeAttribution } from '../helpers.js';
import type { WebTelemetryAddon, WebTelemetryExtendedConfig, WebTelemetryTransport } from '../types.js';

import { WebTelemetryMonitoringCanvas } from './WebTelemetryMonitoringCanvas.js';
import { WebTelemetryCanvasApp } from './WebTelemetryCanvasApp.js';
import { WebTelemetryKV } from './WebTelemetryKV.js';
import { WebTelemetryResources } from './WebTelemetryResources.js';

type INPAttributionReportOpts = NonNullable<Parameters<typeof onINP>[1]> & {
    includeLongAnimationFrameEntries: false;
    includeProcessedEventEntries: false;
};

export class WebTelemetryMonitoringCanvasWithWebVitals extends WebTelemetryMonitoringCanvas {
    protected constructor(
        config: WebTelemetryExtendedConfig,
        transports?: Array<WebTelemetryTransport>,
        addons: Array<WebTelemetryAddon> = [],
        canvasAppInstance?: WebTelemetryCanvasApp,
        KVInstance?: WebTelemetryKV,
        resourcesInstance?: WebTelemetryResources,
    ) {
        super(config, transports, addons, canvasAppInstance, KVInstance, resourcesInstance);
    }
    protected static override _instance: WebTelemetryMonitoringCanvasWithWebVitals;

    public startWebVitals() {
        [onLCP, onCLS, onFCP].forEach((getMetric) => {
            getMetric((metric) => this.KV.push({ key: metric.name, value: metric.value }, sanitizeAttribution(metric)));
        });

        const inpOpts: INPAttributionReportOpts = {
            includeLongAnimationFrameEntries: false,
            includeProcessedEventEntries: false,
        };

        onINP(
            (metric) => this.KV.push({ key: metric.name, value: metric.value }, sanitizeAttribution(metric)),
            inpOpts,
        );
    }

    public static override Instance(
        config: WebTelemetryExtendedConfig,
        addons: Array<WebTelemetryAddon> = [],
        transports?: Array<WebTelemetryTransport>,
        canvasAppInstance?: WebTelemetryCanvasApp,
        KVInstance?: WebTelemetryKV,
        resourcesInstance?: WebTelemetryResources,
    ) {
        return (
            this._instance ||
            (this._instance = new WebTelemetryMonitoringCanvasWithWebVitals(
                config,
                transports,
                addons,
                canvasAppInstance,
                KVInstance,
                resourcesInstance,
            ))
        );
    }
}
