import { AddonFCP } from '../extra/AddonFCP';
import { AddonInfo } from '../extra/AddonInfo';
import { AddonNavigationPerf } from '../extra/AddonNavigationPerf';
import { WebTelemetryConfig, WebTelemetryTransport } from '../types';

import { WebTelemetryApp } from './WebTelemetryApp';

export class WebTelemetryWebApp extends WebTelemetryApp {
    constructor(config: WebTelemetryConfig, transports?: Array<WebTelemetryTransport>) {
        super(config, [new AddonInfo(), new AddonFCP(), new AddonNavigationPerf()], transports);
    }
}
