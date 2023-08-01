import { AddonCanvasApp } from '../extra/AddonCanvasApp';
import { AddonFCP } from '../extra/AddonFCP';
import { AddonInfo } from '../extra/AddonInfo';
import { AddonNavigationPerf } from '../extra/AddonNavigationPerf';
import { WebTelemetryAddon, WebTelemetryConfig, WebTelemetryTransport } from '../types';

import { WebTelemetryApp } from './WebTelemetryApp';

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
