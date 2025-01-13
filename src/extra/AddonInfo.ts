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

interface userAgentDataValues {
    model: string;
    platform: string;
    platformVersion: string;
}

export class AddonInfo implements WebTelemetryAddon<AddonInfoData & AddonInfoMetadata, {}> {
    data(): AddonInfoData & AddonInfoMetadata {
        const userAgent = navigator.userAgent;
        let ua: AddonInfoMetadata = {
            osVersion: this.getOsVersion(userAgent),
            deviceModel: this.getDeviceModel(userAgent),
        };

        this.getHighEntropyValues()
            .then((data) => {
                ua = {
                    osVersion: `${data.platform} ${data.platformVersion}`,
                    deviceModel: `${data.model}`,
                };
            })
            .catch(() => {});

        return {
            hostname: window.location.hostname,
            path: window.location.href,
            ua: userAgent.toString(),
            osVersion: ua.osVersion,
            deviceModel: ua.deviceModel,
        };
    }

    private async getHighEntropyValues() {
        return await navigator.userAgentData.getHighEntropyValues([
            'architecture',
            'model',
            'platform',
            'platformVersion',
            'fullVersionList',
        ]);
    }

    metadata() {
        return {};
    }

    private getOsVersion(userAgent: string): string {
        const osMatches = userAgent.match(/Windows NT \d+\.\d+|Mac OS X \d+_\d+|iPhone OS \d+_\d+|Android \d+\.\d+/);

        if (!osMatches) return '';

        const osString = osMatches[0];

        switch (true) {
            case osString.startsWith('Windows'):
                return osString.replace('Windows NT ', '');

            case osString.startsWith('Mac'):
                return osString.replace('Mac OS X ', '').replace('_', '.');

            case osString.startsWith('iPhone'):
                return osString.replace('iPhone OS ', '').replace('_', '.');

            case osString.startsWith('Android'):
                return osString.replace('Android ', '');

            default:
                return '';
        }
    }

    private getDeviceModel(userAgent: string): string {
        const match = userAgent.match(/$.*$/);
        return match ? match[0].replace('(', '').replace(')', '') : 'Unknown Device Model';
    }
}
