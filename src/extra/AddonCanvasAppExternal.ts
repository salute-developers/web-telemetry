import { WebTelemetryAddon } from '../types';
import { AssistantAppContext } from '@salutejs/client';
interface AddonCanvasAppExternalData {
    projectId?: string;
}

export class AddonCanvasAppExternal implements WebTelemetryAddon<AddonCanvasAppExternalData, {}> {
    data(): AddonCanvasAppExternalData {
        const payload: AddonCanvasAppExternalData = {};

        if (!window.appInitialData) {
            return payload;
        }

        const appContext = window.appInitialData.find(
            (i: { type: string }) => i.type === 'app_context',
        ) as AssistantAppContext;
        if (appContext) {
            const projectId = appContext.app_context?.app_info?.projectId;
            if (projectId) {
                payload.projectId = projectId;
            }
        }

        return payload;
    }
    metadata() {
        return {};
    }
}
