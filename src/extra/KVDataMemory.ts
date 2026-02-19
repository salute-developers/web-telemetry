import { WebTelemetryKV } from '../presets/WebTelemetryKV.js';
import type { KVDataItem, WebTelemetryKVData } from '../types.js';

interface PerformanceWithMemoryAPIs extends Performance {
    memory?: { usedJSHeapSize: number };
    measureUserAgentSpecificMemory?: () => Promise<{ bytes: number }>;
}

const DEFAULT_INTERVAL_MIN = 5;

export class KVDataMemory implements WebTelemetryKVData {
    private KV: WebTelemetryKV;
    private intervalMs: number;
    private timerId: ReturnType<typeof setTimeout> | null = null;
    private measuring = false;
    private lastUsedBytes: number | null = null;

    constructor(KV: WebTelemetryKV, intervalMinutes = DEFAULT_INTERVAL_MIN) {
        this.KV = KV;
        this.intervalMs = intervalMinutes * 60 * 1000;
    }

    private async measure(): Promise<number | null> {
        const perf = performance as PerformanceWithMemoryAPIs;

        if (
            typeof crossOriginIsolated !== 'undefined' &&
            crossOriginIsolated &&
            typeof perf.measureUserAgentSpecificMemory === 'function'
        ) {
            try {
                const result = await perf.measureUserAgentSpecificMemory();
                return result.bytes;
                // eslint-disable-next-line no-empty
            } catch (_e) {}
        }

        if (perf.memory) {
            return perf.memory.usedJSHeapSize;
        }

        return null;
    }

    private async measureAndSend(): Promise<void> {
        if (this.measuring) {
            return;
        }

        this.measuring = true;

        try {
            const bytes = await this.measure();

            if (bytes !== null) {
                this.lastUsedBytes = bytes;
                await this.KV.pushListAndSend(this.KVdata());
            }
        } finally {
            this.measuring = false;
        }
    }

    private scheduleNext(): void {
        this.timerId = setTimeout(async () => {
            await this.measureAndSend();
            this.scheduleNext();
        }, this.intervalMs);
    }

    public async startMonitoring(): Promise<void> {
        await this.measureAndSend();
        this.scheduleNext();
    }

    public endMonitoring(): void {
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }

    KVdata(): KVDataItem[] {
        if (this.lastUsedBytes === null) {
            return [];
        }

        return [
            {
                payload: {
                    key: 'MemoryUsedBytes',
                    value: this.lastUsedBytes,
                },
            },
        ];
    }
}
