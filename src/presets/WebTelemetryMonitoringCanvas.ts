import { KVDataFrameTime } from '../extra/KVDataFrameTime';
import { KVDataLongTask } from '../extra/KVDataLongTask';
import { WebTelemetryAddon, WebTelemetryExtendedConfig, WebTelemetryTransport } from '../types';
import { WebTelemetryCanvasApp } from './WebTelemetryCanvasApp';
import { WebTelemetryKV } from './WebTelemetryKV';
import { WebTelemetryResources } from './WebTelemetryResources';
import { defaultConfig } from '../config';

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

        this.KV = new WebTelemetryKV({
            ...config,
            projectName: `${config.projectName}-metrics`,
        });

        this.resources = new WebTelemetryResources(config.projectName, {
            ...config,
            projectName: `${config.projectName}-resources`,
        });

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
