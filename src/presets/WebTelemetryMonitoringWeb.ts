import { WebTelemetryExtendedConfig } from '../types';
import { KVDataLongTask } from '../extra/KVDataLongTask';
import { KVDataFrameTime } from '../extra/KVDataFrameTime';
import { defaultConfig } from '../config';
import { WebTelemetryTransport } from '../WebTelemetryTransport';

import { WebTelemetryResources } from './WebTelemetryResources';
import { WebTelemetryKV } from './WebTelemetryKV';
import { WebTelemetryWebApp } from './WebTelemetryWebApp';

export class WebTelemetryMonitoringWeb {
    protected static _instance: WebTelemetryMonitoringWeb;

    public webApp: WebTelemetryWebApp;
    public KV: WebTelemetryKV;
    public resources: WebTelemetryResources;
    protected isStartedMonitoring = false;
    private longTask: KVDataLongTask;
    private frameTime: KVDataFrameTime | undefined;

    protected constructor(config: WebTelemetryExtendedConfig, transports?: Array<WebTelemetryTransport>) {
        this.webApp = new WebTelemetryWebApp(config, transports);

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
            (this._instance = new WebTelemetryMonitoringWeb(
                {
                    ...defaultConfig,
                    ...config,
                },
                transports,
            ))
        );
    }
}
