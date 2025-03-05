import type { WebTelemetryAddon, WindowWithAssistant } from '../types.js';

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

        const reference = window as unknown as WindowWithAssistant;

        if (!reference.appInitialData) {
            return payload;
        }

        const appData = reference.appInitialData.find((item) => item.type === 'smart_app_data');

        if (appData) {
            const messageId = appData.sdk_meta?.mid || '';
            if (messageId) {
                payload.messageId = String(messageId);
            }
        } else if (reference.__ASSISTANT_CLIENT__?.firstSmartAppDataMid) {
            const messageId = reference.__ASSISTANT_CLIENT__?.firstSmartAppDataMid;
            payload.messageId = messageId;
        }

        const appContext = reference.appInitialData.find((item) => item.type === 'app_context');

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

        const reference = window as unknown as WindowWithAssistant;

        if (!reference.appInitialData) {
            return payload;
        }

        const appContext = reference.appInitialData.find((item) => item.type === 'app_context');

        if (appContext) {
            const features = appContext.app_context?.features;
            if (features) {
                payload.features = features;
            }
        }

        return payload;
    }
}
