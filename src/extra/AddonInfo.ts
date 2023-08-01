import { WebTelemetryAddon } from '../types';

interface AddonInfoData {
    hostname: string;
    path: string;
    ua: string;
}

export class AddonInfo implements WebTelemetryAddon<AddonInfoData, {}> {
    data(): AddonInfoData {
        return {
            hostname: window.location.hostname,
            path: window.location.href,
            ua: navigator.userAgent.toString(),
        };
    }

    metadata() {
        return {};
    }
}
