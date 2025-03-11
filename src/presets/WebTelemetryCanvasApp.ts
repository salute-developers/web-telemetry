import { AddonCanvasApp } from '../extra/AddonCanvasApp.js';
import { AddonFCP } from '../extra/AddonFCP.js';
import { AddonInfo } from '../extra/AddonInfo.js';
import { AddonNavigationPerf } from '../extra/AddonNavigationPerf.js';
import type { WebTelemetryAddon, WebTelemetryConfig, WebTelemetryTransport } from '../types.js';

import { WebTelemetryApp } from './WebTelemetryApp.js';

export class WebTelemetryCanvasApp extends WebTelemetryApp {
    constructor(
        config: WebTelemetryConfig,
        addons: Array<WebTelemetryAddon> = [],
        transports?: Array<WebTelemetryTransport>,
    ) {
        super(
            config,
            [new AddonInfo(), new AddonFCP(), new AddonCanvasApp(), new AddonNavigationPerf(), ...addons],
            transports,
        );
    }
}
