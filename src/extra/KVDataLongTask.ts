import { WebTelemetryKV } from '../presets/WebTelemetryKV';
import { KVDataItem, WebTelemetryKVData } from '../types';

export class KVDataLongTask implements WebTelemetryKVData {
    private static observer: PerformanceObserver | undefined;

    private durations: number[] = [];
    private max = {
        value: 0,
        meta: {},
    };

    constructor(private KV: WebTelemetryKV) {
        if (window.PerformanceObserver) {
            const handler = this.handler.bind(this);

            if (!KVDataLongTask.observer) {
                try {
                    KVDataLongTask.observer = new PerformanceObserver(handler);
                    KVDataLongTask.observer.observe({ type: 'longtask', buffered: true });
                    // eslint-disable-next-line no-empty
                } catch (e) {}
            }
        }
    }

    private handler(entryList: PerformanceObserverEntryList) {
        for (const entry of entryList.getEntries()) {
            const { duration, startTime } = entry;

            this.durations.push(duration);

            const nextMax = Math.max(this.max.value, duration);

            if (nextMax >= this.max.value) {
                this.max.value = nextMax;
                this.max.meta = {
                    pathname: window.location.pathname,
                    startTime: Math.round(startTime),
                };
            }
        }
    }

    KVdata() {
        return [
            {
                payload: {
                    key: 'LongTaskCounter',
                    value: this.durations.length,
                },
            },
            {
                payload: {
                    key: 'LongTaskAvg',
                    value: Math.round(this.durations.reduce((acc, el) => acc + el, 0) / this.durations.length),
                },
            },
            {
                payload: {
                    key: 'LongTaskMax',
                    value: this.max.value,
                },
                meta: this.max.meta,
            },
        ] as [KVDataItem, KVDataItem, KVDataItem];
    }

    private end() {
        KVDataLongTask.observer?.disconnect();
    }

    public startLongTasksMonitoring() {
        const handleVisibilityChange = () => {
            this.KV.pushListAndSend(this.KVdata());
            /**
             * "visibilitychange" сработает также, если пользователь
             * вернется в канвас. Например, по кнопке назад.
             * longTask мониторинг не нужен, когда вебвью не активно +
             * метрик при первом отрытии достаточно.
             */
            this.end();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange, { once: true });
    }
}
