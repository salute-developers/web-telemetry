import { AssistantAppContext } from '@salutejs/client';

import { WebTelemetryAddon } from '../types';

type CurrentAssistantAppContext = AssistantAppContext & {
    app_context: {
        surface: string;
    };
};

export interface AddonCanvasAppData {
    messageId?: string;
    deviceId?: string;
    sdkVersion?: string;
    surface?: string;
}

export interface AddonCanvasAppMetadata {
    features?: Record<string, any>;
}

export class AddonCanvasApp implements WebTelemetryAddon<AddonCanvasAppData, AddonCanvasAppMetadata> {
    data(): AddonCanvasAppData {
        const payload: AddonCanvasAppData = {};

        if (!window.appInitialData) {
            return payload;
        }

        const appData = window.appInitialData.find((i: { type: string }) => i.type === 'smart_app_data');
        if (appData) {
            const messageId = appData.sdkMeta?.mid || appData.sdk_meta?.mid || '';
            if (messageId) {
                payload.messageId = String(messageId);
            }
        } else if (window.__ASSISTANT_CLIENT__?.firstSmartAppDataMid) {
            const messageId = window.__ASSISTANT_CLIENT__?.firstSmartAppDataMid;
            payload.messageId = messageId;
        }

        const appContext = window.appInitialData.find(
            (i: { type: string }) => i.type === 'app_context',
        ) as CurrentAssistantAppContext;
        if (appContext) {
            const { device_id, sdk_version, surface } = appContext.app_context;

            if (device_id) {
                payload.deviceId = device_id;
            }
            if (sdk_version) {
                payload.sdkVersion = sdk_version;
            }

            if (surface) {
                payload.surface = surface;
            }
        }

        return payload;
    }

    metadata() {
        const payload: AddonCanvasAppMetadata = {};

        if (!window.appInitialData) {
            return payload;
        }

        const appContext = window.appInitialData.find((i: { type: string }) => i.type === 'app_context');
        if (appContext) {
            const features = appContext.app_context?.features;
            if (features) {
                payload.features = features;
            }
        }

        return payload;
    }
}
