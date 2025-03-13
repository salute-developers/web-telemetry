import type { WebTelemetryAddon } from '../types.js';

interface AddonInfoData {
    hostname: string;
    path: string;
    ua: string;
}

interface HighEntropyUserAgentData {
    architecture?: string;
    model?: string;
    platform?: string;
    platformVersion?: string;
    fullVersionList?: Array<{
        brand: string;
        version: string;
    }>;
    telemetryVersion: string;
}

export class AddonInfo
    implements WebTelemetryAddon<AddonInfoData, HighEntropyUserAgentData | { telemetryVersion: string }>
{
    data(): AddonInfoData {
        return {
            hostname: window.location.hostname,
            path: window.location.href,
            ua: navigator.userAgent.toString(),
        };
    }

    private async getHighEntropyValues(): Promise<HighEntropyUserAgentData | null> {
        if (!navigator?.userAgentData?.getHighEntropyValues) {
            return null;
        }

        try {
            const entropyValues = await navigator.userAgentData.getHighEntropyValues([
                'architecture',
                'model',
                'platform',
                'platformVersion',
                'fullVersionList',
            ]);

            return {
                ...entropyValues,
                telemetryVersion: '__TELEMETRY_VERSION__',
            };
        } catch (error) {
            console.error('Ошибка high entropy values:', error);
            return null;
        }
    }

    async metadata(): Promise<HighEntropyUserAgentData | { telemetryVersion: string }> {
        const userAgentData = await this.getHighEntropyValues();

        if (userAgentData) {
            return userAgentData;
        }

        return {
            telemetryVersion: '__TELEMETRY_VERSION__',
        };
    }
}
