import { beforeEach, describe, expect, it, vi } from 'vitest';
import { onINP } from 'web-vitals/attribution';

import type { WebTelemetryAddon, WebTelemetryExtendedConfig, WebTelemetryTransport } from '../types.js';

const callbacks = vi.hoisted(() => ({
    CLS: undefined as undefined | ((metric: any) => void),
    FCP: undefined as undefined | ((metric: any) => void),
    INP: undefined as undefined | ((metric: any) => void),
    LCP: undefined as undefined | ((metric: any) => void),
}));

vi.mock('web-vitals/attribution', () => ({
    onCLS: vi.fn((callback) => {
        callbacks.CLS = callback;
    }),
    onFCP: vi.fn((callback) => {
        callbacks.FCP = callback;
    }),
    onINP: vi.fn((callback) => {
        callbacks.INP = callback;
    }),
    onLCP: vi.fn((callback) => {
        callbacks.LCP = callback;
    }),
}));

import { WebTelemetryMonitoringCanvasWithWebVitals } from './WebTelemetryMonitoringCanvasWithWebVitals.js';
import { WebTelemetryMonitoringWebAppWithWebVitals } from './WebTelemetryMonitoringWebAppWithWebVitals.js';

const config: WebTelemetryExtendedConfig = { buffSize: 1, debug: false, delay: 0, projectName: 'web-vitals' };

const metrics = [
    {
        attribution: {
            entries: [{ value: 0.1 }],
            largestShiftTarget: '#shift',
            largestShiftTime: 2,
            largestShiftValue: 0.1,
            loadState: 'complete',
        },
        name: 'CLS',
        value: 0.1,
    },
    {
        attribution: {
            firstByteToFCP: 20,
            loadState: 'complete',
            navigationEntry: { ignored: true },
            timeToFirstByte: 10,
        },
        name: 'FCP',
        value: 30,
    },
    {
        attribution: {
            eventEntry: { ignored: true },
            inputDelay: 1,
            interactionTarget: '#button',
            interactionTime: 2,
            interactionType: 'pointer',
            loadState: 'complete',
            longAnimationFrameEntries: [{ ignored: true }],
            nextPaintTime: 3,
            presentationDelay: 4,
            processingDuration: 5,
        },
        name: 'INP',
        value: 12,
    },
    {
        attribution: {
            element: { ignored: true },
            elementRenderDelay: 5,
            resourceLoadDelay: 3,
            resourceLoadDuration: 4,
            target: '#hero',
            timeToFirstByte: 1,
            url: 'https://example.test/hero.jpg',
        },
        name: 'LCP',
        value: 13,
    },
] as const;

for (const [name, Factory, inpOptions] of [
    ['Web App', WebTelemetryMonitoringWebAppWithWebVitals, { includeProcessedEventEntries: false }],
    [
        'Canvas',
        WebTelemetryMonitoringCanvasWithWebVitals,
        { includeLongAnimationFrameEntries: false, includeProcessedEventEntries: false },
    ],
] as const) {
    describe(`${name} WithWebVitals`, () => {
        beforeEach(() => {
            Reflect.set(Factory, '_instance', undefined);
            callbacks.CLS = undefined;
            callbacks.FCP = undefined;
            callbacks.INP = undefined;
            callbacks.LCP = undefined;
            vi.clearAllMocks();
        });

        it('writes shaped LCP, CLS, FCP, and INP records through its Instance KV channel', async () => {
            const transport: WebTelemetryTransport = { send: vi.fn() };
            const instance = Factory.Instance(config, [transport]);

            instance.startWebVitals();

            callbacks.LCP?.(metrics[3]);
            callbacks.CLS?.(metrics[0]);
            callbacks.FCP?.(metrics[1]);
            callbacks.INP?.(metrics[2]);

            await vi.waitFor(() => expect(transport.send).toHaveBeenCalledTimes(4));

            const records = vi.mocked(transport.send).mock.calls.map(([body]) => {
                const [event] = JSON.parse(body) as Array<{ key: string; metadata: string; valueNum: number }>;
                const { telemetryVersion: _telemetryVersion, ...metadata } = JSON.parse(event.metadata) as Record<
                    string,
                    unknown
                >;
                return { key: event.key, metadata, value: event.valueNum };
            });

            expect(records).toEqual([
                {
                    key: 'LCP',
                    metadata: {
                        elementRenderDelay: 5,
                        resourceLoadDelay: 3,
                        resourceLoadDuration: 4,
                        target: '#hero',
                        timeToFirstByte: 1,
                        url: 'https://example.test/hero.jpg',
                    },
                    value: 13,
                },
                {
                    key: 'CLS',
                    metadata: {
                        largestShiftTarget: '#shift',
                        largestShiftTime: 2,
                        largestShiftValue: 0.1,
                        loadState: 'complete',
                    },
                    value: 0.1,
                },
                { key: 'FCP', metadata: { firstByteToFCP: 20, loadState: 'complete', timeToFirstByte: 10 }, value: 30 },
                {
                    key: 'INP',
                    metadata: {
                        inputDelay: 1,
                        interactionTarget: '#button',
                        interactionTime: 2,
                        interactionType: 'pointer',
                        loadState: 'complete',
                        nextPaintTime: 3,
                        presentationDelay: 4,
                        processingDuration: 5,
                    },
                    value: 12,
                },
            ]);
            expect(onINP).toHaveBeenCalledWith(expect.any(Function), inpOptions);
        });
    });
}

describe('Canvas WithWebVitals factory', () => {
    beforeEach(() => {
        Reflect.set(WebTelemetryMonitoringCanvasWithWebVitals, '_instance', undefined);
    });

    it('keeps custom addons and singleton behavior through its public factory', async () => {
        const transport: WebTelemetryTransport = { send: vi.fn() };
        const addon: WebTelemetryAddon = { data: () => ({ custom: true }), metadata: () => ({}) };
        const instance = WebTelemetryMonitoringCanvasWithWebVitals.Instance(config, [transport], [addon]);

        instance.canvasApp.send();

        await vi.waitFor(() => expect(transport.send).toHaveBeenCalledTimes(1));
        expect(JSON.parse(vi.mocked(transport.send).mock.calls[0][0])).toMatchObject({ custom: true });
        expect(WebTelemetryMonitoringCanvasWithWebVitals.Instance({ projectName: 'another-project' })).toBe(instance);
    });
});
