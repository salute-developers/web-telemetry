import { WebTelemetryAddon } from '../types';

type AddonFCPData = {
    FCP: number;
};

export class AddonFCP implements WebTelemetryAddon<AddonFCPData, {}> {
    private static observer: PerformanceObserver | undefined;

    private value = 0;

    constructor() {
        if (window.PerformanceObserver) {
            const handler = this.handler.bind(this);

            if (!AddonFCP.observer) {
                try {
                    AddonFCP.observer = new PerformanceObserver(handler);
                    AddonFCP.observer.observe({ type: 'paint', buffered: true });
                    // eslint-disable-next-line no-empty
                } catch (e) {}
            }
        }
    }

    private handler(entryList: PerformanceObserverEntryList) {
        const entries = entryList.getEntriesByName('first-contentful-paint');
        const firstEntry = entries[0];

        this.value = firstEntry ? firstEntry.startTime : 0;
    }

    data(): AddonFCPData {
        return {
            FCP: Math.round(this.value),
        };
    }

    metadata() {
        return {};
    }
}
