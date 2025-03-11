import { KVDataFrameTime } from '../extra/KVDataFrameTime.js';
import { KVDataLongTask } from '../extra/KVDataLongTask.js';
import type { WebTelemetryAddon, WebTelemetryExtendedConfig, WebTelemetryTransport } from '../types.js';
import { defaultConfig } from '../config.js';

import { WebTelemetryCanvasApp } from './WebTelemetryCanvasApp.js';
import { WebTelemetryKV } from './WebTelemetryKV.js';
import { WebTelemetryResources } from './WebTelemetryResources.js';

export class WebTelemetryMonitoringCanvas {
    protected static _instance: WebTelemetryMonitoringCanvas;

    public canvasApp: WebTelemetryCanvasApp;
    public KV: WebTelemetryKV;
    public resources: WebTelemetryResources;
    protected isStartedMonitoring = false;
    private longTask: KVDataLongTask;
    private frameTime: KVDataFrameTime | undefined;

    protected constructor(
        config: WebTelemetryExtendedConfig,
        transports?: Array<WebTelemetryTransport>,
        addons: Array<WebTelemetryAddon> = [],
    ) {
        this.canvasApp = new WebTelemetryCanvasApp(config, addons, transports);

        this.KV = new WebTelemetryKV(
            {
                ...config,
                projectName: `${config.projectName}-metrics`,
            },
            transports,
        );

        this.resources = new WebTelemetryResources(
            config.projectName,
            {
                ...config,
                projectName: `${config.projectName}-resources`,
            },
            transports,
        );

        this.longTask = new KVDataLongTask(this.KV);

        if (config.frameTime) {
            this.frameTime = new KVDataFrameTime(this.KV);
        }
    }

    public startMonitoring() {
        if (this.isStartedMonitoring) {
            return;
        }

        this.isStartedMonitoring = true;

        this.longTask.startLongTasksMonitoring();
        this.resources.start();
        this.frameTime?.startMonitoring();
    }

    public static Instance(config: WebTelemetryExtendedConfig, transports?: Array<WebTelemetryTransport>) {
        return (
            this._instance ||
            (this._instance = new WebTelemetryMonitoringCanvas(
                {
                    ...defaultConfig,
                    ...config,
                },
                transports,
            ))
        );
    }
}
