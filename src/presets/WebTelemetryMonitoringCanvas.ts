import { KVDataFrameTime } from '../extra/KVDataFrameTime.js';
import { KVDataLongTask } from '../extra/KVDataLongTask.js';
import type { WebTelemetryAddon, WebTelemetryExtendedConfig, WebTelemetryTransport } from '../types.js';
import { defaultConfig } from '../config.js';
import { KVDataMemory } from '../extra/KVDataMemory.js';

import { WebTelemetryCanvasApp } from './WebTelemetryCanvasApp.js';
import { WebTelemetryKV } from './WebTelemetryKV.js';
import { WebTelemetryResources } from './WebTelemetryResources.js';

export class WebTelemetryMonitoringCanvas {
    protected static _instance: WebTelemetryMonitoringCanvas;

    public canvasApp: WebTelemetryCanvasApp;
    public KV: WebTelemetryKV;
    public memory: KVDataMemory;
    protected isStartedMemoryMonitoring = false;
    public resources: WebTelemetryResources;
    protected isStartedMonitoring = false;
    private longTask: KVDataLongTask;
    private frameTime: KVDataFrameTime | undefined;

    protected constructor(
        config: WebTelemetryExtendedConfig,
        transports?: Array<WebTelemetryTransport>,
        addons: Array<WebTelemetryAddon> = [],
        canvasAppInstance?: WebTelemetryCanvasApp,
        KVInstance?: WebTelemetryKV,
        resourcesInstance?: WebTelemetryResources,
    ) {
        this.canvasApp = canvasAppInstance ?? new WebTelemetryCanvasApp(config, addons, transports);

        this.KV =
            KVInstance ??
            new WebTelemetryKV(
                {
                    ...config,
                    projectName: `${config.projectName}-metrics`,
                },
                transports,
            );

        this.resources =
            resourcesInstance ??
            new WebTelemetryResources(
                config.projectName,
                {
                    ...config,
                    projectName: `${config.projectName}-resources`,
                },
                transports,
            );

        this.memory = new KVDataMemory(this.KV);

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

    public startMemoryMonitoring() {
        if (this.isStartedMemoryMonitoring) {
            return;
        }

        this.isStartedMemoryMonitoring = true;
        this.memory.startMonitoring();
    }

    public static Instance(
        config: WebTelemetryExtendedConfig,
        addons: Array<WebTelemetryAddon> = [],
        transports?: Array<WebTelemetryTransport>,
        canvasAppInstance?: WebTelemetryCanvasApp,
        KVInstance?: WebTelemetryKV,
        resourcesInstance?: WebTelemetryResources,
    ) {
        return (
            this._instance ||
            (this._instance = new WebTelemetryMonitoringCanvas(
                {
                    ...defaultConfig,
                    ...config,
                },
                transports,
                addons,
                canvasAppInstance,
                KVInstance,
                resourcesInstance,
            ))
        );
    }
}
