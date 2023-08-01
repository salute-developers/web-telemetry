import { AddonCanvasAppExternal } from './extra/AddonCanvasAppExternal';
import { WebTelemetryMonitoringCanvasWithWebVitals } from './presets/WebTelemetryMonitoringCanvasWithWebVitals';

/**
 * Этот пресет используется для мониторинга внешних канвасов.
 * Подключается для всех внешних канвасов через AssistantSDK путем
 * добавляение тега <script src="https://cdn.ru/path-to-script-below.js">.
 */
export const monitorInstance = WebTelemetryMonitoringCanvasWithWebVitals.Instance(
    {
        projectName: 'external',
    },
    [new AddonCanvasAppExternal()],
);

if (!window.location.host.includes('app.sberdevices.ru')) {
    monitorInstance.resources.start();
    monitorInstance.canvasApp.send();
    monitorInstance.startWebVitals();
}
