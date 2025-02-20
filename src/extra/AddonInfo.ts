import { WebTelemetryAddon } from '../types'; // @ts-ignore
import { packageVersion } from '../../generateVersion.js';

interface AddonInfoData {
    hostname: string;
    path: string;
    ua: string;
}

export class AddonInfo implements WebTelemetryAddon<AddonInfoData, { telemetryVersion: string }> {
    data(): AddonInfoData {
        return {
            hostname: window.location.hostname,
            path: window.location.href,
            ua: navigator.userAgent.toString(),
        };
    }

    metadata() {
        return {
            telemetryVersion: packageVersion,
        };
    }
}
