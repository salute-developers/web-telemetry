import type { WebTelemetryExtendedConfig } from '../types.js';
import { KVDataLongTask } from '../extra/KVDataLongTask.js';
import { KVDataFrameTime } from '../extra/KVDataFrameTime.js';
import { defaultConfig } from '../config.js';
import type { WebTelemetryTransport } from '../WebTelemetryTransport.js';
import { KVDataMemory } from '../extra/KVDataMemory.js';

import { WebTelemetryResources } from './WebTelemetryResources.js';
import { WebTelemetryKV } from './WebTelemetryKV.js';
import { WebTelemetryWebApp } from './WebTelemetryWebApp.js';

export class WebTelemetryMonitoringWeb {
    protected static _instance: WebTelemetryMonitoringWeb;

    public webApp: WebTelemetryWebApp;
    public memory: KVDataMemory;
    public KV: WebTelemetryKV;
    public resources: WebTelemetryResources;
    protected isStartedMonitoring = false;
    protected isStartedMemoryMonitoring = false;
    private longTask: KVDataLongTask;
    private frameTime: KVDataFrameTime | undefined;

    protected constructor(
        config: WebTelemetryExtendedConfig,
        transports?: Array<WebTelemetryTransport>,
        webAppInstance?: WebTelemetryWebApp,
        KVInstance?: WebTelemetryKV,
        resourcesInstance?: WebTelemetryResources,
    ) {
        this.webApp = webAppInstance ?? new WebTelemetryWebApp(config, transports);

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
        transports?: Array<WebTelemetryTransport>,
        webAppInstance?: WebTelemetryWebApp,
        KVInstance?: WebTelemetryKV,
        resourcesInstance?: WebTelemetryResources,
    ) {
        return (
            this._instance ||
            (this._instance = new WebTelemetryMonitoringWeb(
                {
                    ...defaultConfig,
                    ...config,
                },
                transports,
                webAppInstance,
                KVInstance,
                resourcesInstance,
            ))
        );
    }
}
