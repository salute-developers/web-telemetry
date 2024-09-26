import { WebTelemetryAddon } from '../types';

const ENTRIES_TO_SAVE = [
    'entryType',
    'startTime',
    'duration',
    'initiatorType',
    'nextHopProtocol',
    'redirectStart',
    'redirectEnd',
    'fetchStart',
    'domainLookupStart',
    'domainLookupEnd',
    'connectStart',
    'connectEnd',
    'secureConnectionStart',
    'requestStart',
    'responseStart',
    'responseEnd',
    'transferSize',
    'encodedBodySize',
    'decodedBodySize',
    'unloadEventStart',
    'unloadEventEnd',
    'domInteractive',
    'domContentLoadedEventStart',
    'domContentLoadedEventEnd',
    'domComplete',
    'loadEventStart',
    'loadEventEnd',
    'type',
    'redirectCount',
    'workerStart',
] as const;

type AddonNavigationPerfData = Partial<Record<(typeof ENTRIES_TO_SAVE)[number], string | number>>;

export class AddonNavigationPerf implements WebTelemetryAddon<AddonNavigationPerfData, {}> {
    private static observer: PerformanceObserver | undefined;

    private value: AddonNavigationPerfData = {};

    constructor() {
        if (window.PerformanceObserver) {
            const handler = this.handler.bind(this);
            if (!AddonNavigationPerf.observer) {
                try {
                    AddonNavigationPerf.observer = new PerformanceObserver(handler);
                    AddonNavigationPerf.observer.observe({
                        type: 'navigation',
                        buffered: true,
                    });
                    // eslint-disable-next-line no-empty
                } catch (e) {}
            }
        }
    }

    private handler(entryList: PerformanceObserverEntryList) {
        const entries = entryList.getEntries();

        for (const entry of entries) {
            const data = entry.toJSON ? entry.toJSON() : {};

            for (const entryName of ENTRIES_TO_SAVE) {
                const value = data[entryName];
                if (value) {
                    this.value[entryName] = typeof value === 'number' ? Math.round(value) : value;
                }
            }
        }
    }

    data() {
        return { ...this.value };
    }

    metadata() {
        return {};
    }
}
