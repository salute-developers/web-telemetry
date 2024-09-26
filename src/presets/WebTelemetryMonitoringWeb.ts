import { WebTelemetryExtendedConfig } from '../types';
import { WebTelemetryWebApp } from './WebTelemetryWebApp';
import { WebTelemetryKV } from './WebTelemetryKV';
import { WebTelemetryResources } from './WebTelemetryResources';
import { KVDataLongTask } from '../extra/KVDataLongTask';
import { KVDataFrameTime } from '../extra/KVDataFrameTime';
import { defaultConfig } from '../config';

export class WebTelemetryMonitoringWeb {
    protected static _instance: WebTelemetryMonitoringWeb;

    public webApp: WebTelemetryWebApp;
    public KV: WebTelemetryKV;
    public resources: WebTelemetryResources;
    protected isStartedMonitoring = false;
    private longTask: KVDataLongTask;
    private frameTime: KVDataFrameTime | undefined;

    protected constructor(config: WebTelemetryExtendedConfig) {
        this.webApp = new WebTelemetryWebApp(config);

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

    public static Instance(config: WebTelemetryExtendedConfig) {
        return (
            this._instance ||
            (this._instance = new WebTelemetryMonitoringWeb({
                ...defaultConfig,
                ...config,
            }))
        );
    }
}
