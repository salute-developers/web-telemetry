import { WebTelemetryAddon } from '../types';

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
}

interface AddonInfoMetadata {
    osVersion: string;
    deviceModel: string;
}

export class AddonInfo implements WebTelemetryAddon<AddonInfoData, HighEntropyUserAgentData | AddonInfoMetadata> {
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
            return await navigator.userAgentData.getHighEntropyValues([
                'architecture',
                'model',
                'platform',
                'platformVersion',
                'fullVersionList',
            ]);
        } catch (error) {
            console.error('Ошибка high entropy values:', error);
            return null;
        }
    }

    async metadata(): Promise<HighEntropyUserAgentData | AddonInfoMetadata> {
        const userAgentData = await this.getHighEntropyValues();  
    
        if (userAgentData) {  
            return userAgentData  
        }  
    
        return {  
            osVersion: '',  
            deviceModel: '',  
        };  
    } 
}
