import { WebTelemetryKV } from '../presets/WebTelemetryKV.js';
import type { KVDataItem, WebTelemetryKVData } from '../types.js';

interface PerformanceWithMemoryAPIs extends Performance {
    memory?: { usedJSHeapSize: number };
    measureUserAgentSpecificMemory?: () => Promise<MemoryMeasurementResult>;
}

const DEFAULT_INTERVAL_MIN = 5;
type MeasurementSource = 'MeasureUserAgentSpecificMemory' | 'JSHeapUsed';
type MeasurementAPI = 'uasm' | 'jsHeap';

interface MemoryMeasurementBreakdownItem {
    bytes: number;
    types?: string[];
}

interface MemoryMeasurementResult {
    bytes: number;
    breakdown?: MemoryMeasurementBreakdownItem[];
}

interface MemoryMeasurementSnapshot {
    bytes: number;
    api: MeasurementAPI;
    source: MeasurementSource;
    rawBreakdown: MemoryMeasurementBreakdownItem[];
}

export class KVDataMemory implements WebTelemetryKVData {
    private KV: WebTelemetryKV;
    private intervalMs: number;
    private timerId: ReturnType<typeof setTimeout> | null = null;
    private measuring = false;
    private lastMeasurement: MemoryMeasurementSnapshot | null = null;

    constructor(KV: WebTelemetryKV, intervalMinutes = DEFAULT_INTERVAL_MIN) {
        this.KV = KV;
        this.intervalMs = intervalMinutes * 60 * 1000;
    }

    private async measure(): Promise<MemoryMeasurementSnapshot | null> {
        const perf = performance as PerformanceWithMemoryAPIs;

        if (
            typeof crossOriginIsolated !== 'undefined' &&
            crossOriginIsolated &&
            typeof perf.measureUserAgentSpecificMemory === 'function'
        ) {
            try {
                const result = await perf.measureUserAgentSpecificMemory();
                return {
                    bytes: result.bytes,
                    api: 'uasm',
                    source: 'MeasureUserAgentSpecificMemory',
                    rawBreakdown: result.breakdown ?? [],
                };
                // eslint-disable-next-line no-empty
            } catch (e) {
                console.log('UASM error: ', e);
            }
        }

        if (perf.memory) {
            return {
                bytes: perf.memory.usedJSHeapSize,
                api: 'jsHeap',
                source: 'JSHeapUsed',
                rawBreakdown: [],
            };
        }

        return null;
    }

    private async measureAndSend(): Promise<void> {
        if (this.measuring) {
            return;
        }

        this.measuring = true;

        try {
            const measurement = await this.measure();

            if (measurement !== null) {
                this.lastMeasurement = measurement;
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
        if (this.lastMeasurement === null) {
            return [];
        }

        return [
            {
                payload: {
                    key: 'MemoryUsedBytes',
                    value: this.lastMeasurement.bytes,
                },
                meta: {
                    api: this.lastMeasurement.api,
                    source: this.lastMeasurement.source,
                    rawBreakdown: this.lastMeasurement.rawBreakdown,
                },
            },
        ];
    }
}
