import { WebTelemetryAddon } from '../types';

interface AddonInfoData {
    hostname: string;
    path: string;
    ua: string;
}

interface AddonInfoMetadata {
    osVersion: string;
    deviceModel: string;
}

interface UserAgentDataValues {
    model: string;
    platform: string;
    platformVersion: string;
}

export class AddonInfo implements WebTelemetryAddon<AddonInfoData, AddonInfoMetadata> {
    data(): AddonInfoData {
        return {
            hostname: window.location.hostname,
            path: window.location.href,
            ua: navigator.userAgent.toString(),
        };
    }

    private async getHighEntropyValues(): Promise<UserAgentDataValues | null> {
        if (!navigator?.userAgentData?.getHighEntropyValues) {
            return Promise.resolve(null);
        }

        try {
            return await navigator.userAgentData.getHighEntropyValues([
                'architecture',
                'model',
                'platform',
                'platformVersion',
                'fullVersionList',
            ]);
        } catch (error) {
            console.error('Ошибка high entropy values:', error);
            return Promise.resolve(null);
        }
    }

    metadata(): Promise<AddonInfoMetadata> {
        return new Promise(async (resolve) => {
            const userAgentData = await this.getHighEntropyValues();

            if (userAgentData) {
                resolve({
                    osVersion: `${userAgentData.platform} ${userAgentData.platformVersion}`,
                    deviceModel: `${userAgentData.model}`,
                });
            } else {
                resolve({
                    osVersion: '',
                    deviceModel: '',
                });
            }
        });
    }
}
