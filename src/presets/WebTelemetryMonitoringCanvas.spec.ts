import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WebTelemetryAddon, WebTelemetryExtendedConfig, WebTelemetryTransport } from '../types.js';
import { WebTelemetryTransportDebug } from '../WebTelemetryTransport.js';

import { WebTelemetryCanvasApp } from './WebTelemetryCanvasApp.js';
import { WebTelemetryKV } from './WebTelemetryKV.js';
import { WebTelemetryMonitoringCanvas } from './WebTelemetryMonitoringCanvas.js';
import { WebTelemetryMonitoringCanvasWithWebVitals } from './WebTelemetryMonitoringCanvasWithWebVitals.js';
import { WebTelemetryResources } from './WebTelemetryResources.js';

// These ordinary overrides are checked by tsc against both static factory types.
class CanvasWrapper extends WebTelemetryMonitoringCanvas {
    public static override Instance(
        config: WebTelemetryExtendedConfig,
        addons: Array<WebTelemetryAddon> = [],
        transports?: Array<WebTelemetryTransport>,
    ) {
        return super.Instance(config, addons, transports);
    }
}

class CanvasWithWebVitalsWrapper extends WebTelemetryMonitoringCanvasWithWebVitals {
    public static override Instance(
        config: WebTelemetryExtendedConfig,
        addons: Array<WebTelemetryAddon> = [],
        transports?: Array<WebTelemetryTransport>,
    ) {
        return super.Instance(config, addons, transports);
    }
}

const config: WebTelemetryExtendedConfig = { projectName: 'canvas-factory', debug: true };
const addon: WebTelemetryAddon = { data: () => ({ custom: true }), metadata: () => ({}) };
const transport: WebTelemetryTransport = { send: vi.fn() };

for (const [name, Factory] of [
    ['WebTelemetryMonitoringCanvas', WebTelemetryMonitoringCanvas],
    ['WebTelemetryMonitoringCanvasWithWebVitals', WebTelemetryMonitoringCanvasWithWebVitals],
] as const) {
    describe(name, () => {
        beforeEach(() => {
            Reflect.set(Factory, '_instance', undefined);
        });

        it('routes addons and transports from the new factory order', () => {
            const transports = [transport];
            const instance = Factory.Instance(config, [addon], transports);

            expect(Reflect.get(instance.canvasApp, 'addons')).toContain(addon);
            expect(Reflect.get(instance.canvasApp, 'transports')).toBe(transports);
            expect(Reflect.get(instance.KV, 'transports')).toBe(transports);
            expect(Reflect.get(instance.resources, 'transports')).toBe(transports);
        });

        it('uses default transports when the third argument is omitted', () => {
            const instance = Factory.Instance(config, [addon]);

            expect(Reflect.get(instance.canvasApp, 'addons')).toContain(addon);
            expect(Reflect.get(instance.canvasApp, 'transports')[0]).toBeInstanceOf(WebTelemetryTransportDebug);
            expect(Reflect.get(instance.KV, 'transports')[0]).toBeInstanceOf(WebTelemetryTransportDebug);
            expect(Reflect.get(instance.resources, 'transports')[0]).toBeInstanceOf(WebTelemetryTransportDebug);
        });

        it('defaults addons when undefined is passed explicitly', () => {
            const transports = [transport];
            const instance = Factory.Instance(config, undefined, transports);

            expect(Reflect.get(instance.canvasApp, 'addons')).toHaveLength(4);
            expect(Reflect.get(instance.canvasApp, 'transports')).toBe(transports);
        });

        it('preserves an explicitly empty transport array', () => {
            const transports: WebTelemetryTransport[] = [];
            const instance = Factory.Instance(config, [addon], transports);

            expect(Reflect.get(instance.canvasApp, 'transports')).toBe(transports);
            expect(Reflect.get(instance.KV, 'transports')).toBe(transports);
            expect(Reflect.get(instance.resources, 'transports')).toBe(transports);
        });

        it('keeps all three injected instances in their matching constructor positions', () => {
            const app = new WebTelemetryCanvasApp(config, [], []);
            const KV = new WebTelemetryKV(config, []);
            const resources = new WebTelemetryResources(config.projectName, config, []);

            const instance = Factory.Instance(config, [addon], [transport], app, KV, resources);

            expect(instance.canvasApp).toBe(app);
            expect(instance.KV).toBe(KV);
            expect(instance.resources).toBe(resources);
        });

        it('returns the first instance on repeated calls', () => {
            const first = Factory.Instance(config, [addon], [transport]);

            expect(Factory.Instance({ projectName: 'other-project' }, [], [])).toBe(first);
        });
    });
}

describe('Canvas subclass static factory compatibility', () => {
    it('allows ordinary overrides for both variants', () => {
        expect(CanvasWrapper.Instance(config).canvasApp).toBeDefined();
        expect(CanvasWithWebVitalsWrapper.Instance(config).canvasApp).toBeDefined();
    });
});
