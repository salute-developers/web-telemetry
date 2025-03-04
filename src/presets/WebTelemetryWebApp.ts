import { AddonFCP } from '../extra/AddonFCP.js';
import { AddonInfo } from '../extra/AddonInfo.js';
import { AddonNavigationPerf } from '../extra/AddonNavigationPerf.js';
import type { WebTelemetryConfig, WebTelemetryTransport } from '../types.js';

import { WebTelemetryApp } from './WebTelemetryApp.js';

export class WebTelemetryWebApp extends WebTelemetryApp {
    constructor(config: WebTelemetryConfig, transports?: Array<WebTelemetryTransport>) {
        super(config, [new AddonInfo(), new AddonFCP(), new AddonNavigationPerf()], transports);
    }
}
