import type { WebTelemetryBaseEvent, WebTelemetryResourcesConfig, WebTelemetryTransport } from '../types.js';
import { WebTelemetryBase } from '../WebTelemetryBase.js';

const FIELDS_TO_EXTRACT = [
    'name',
    'fileName',
    'entryType',
    'startTime',
    'duration',
    'initiatorType',
    'nextHopProtocol',
    'workerStart',
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
] as const;

// regexp for video from https://debugpointer.com/regex/regex-for-file-extension
export const VIDEO_URLs =
    /(^.*\.(mp4|avi|wmv|mov|flv|mkv|webm|vob|ogv|m4v|3gp|3g2|mpeg|mpg|m2v|m4v|svi|3gpp|3gpp2|mxf|roq|nsv|flv|f4v|f4p|f4a|f4b)$)/gim;

const PERMANENT_URLS_BLACKLIST = [
    /api\.amplitude\.com/,
    /ingest\.sentry\.io/,
    /mc\.yandex\.ru/,
    /gt\.andata\.ru/,
    /top-fwz1\.mail\.ru/,
    VIDEO_URLs,
];

export const validatePerformanceEntry = (...args: RegExp[][]) => {
    const flatArgs = args.flat();
    return (entry: PerformanceEntry) => {
        const testFn = (regEx: RegExp) => !regEx.test(entry.name);
        return flatArgs.every(testFn);
    };
};

interface WebTelemetryResourcesData extends Partial<Record<(typeof FIELDS_TO_EXTRACT)[number], string | number>> {
    hostname: string;
    project: string;
    path: string;
}

export class WebTelemetryResources extends WebTelemetryBase<WebTelemetryResourcesData, WebTelemetryResourcesData> {
    private name: string;

    private static observer: PerformanceObserver | undefined;
    private validatePerformanceEntry;
    private isObservationStarted: boolean = false;
    private readonly observeResourcesAfterLoad: boolean;
    private hasShutDown = false;
    private sharedShutdownPromise: Promise<void> | null = null;

    private readonly boundLoadFinalizer = () => {
        void this.finalizeShutdown();
    };

    private readonly onPerformanceObserver = (entryList: PerformanceObserverEntryList) => {
        void this.processResourceEntries(entryList.getEntries()).catch((error) => {
            console.error(error);
        });
    };

    constructor(name: string, config: WebTelemetryResourcesConfig, transports?: Array<WebTelemetryTransport>) {
        super(config, [], transports);

        this.validatePerformanceEntry = validatePerformanceEntry(
            PERMANENT_URLS_BLACKLIST,
            config.resourcesBlackList || [],
        );
        this.name = name;
        this.observeResourcesAfterLoad = config.observeResourcesAfterLoad ?? false;

        if (typeof window !== 'undefined' && window.PerformanceObserver && !WebTelemetryResources.observer) {
            WebTelemetryResources.observer = new PerformanceObserver(this.onPerformanceObserver);
        }
    }

    /**
     * Обрабатывает записи Performance API: фильтрация, push в очередь телеметрии (асинхронно по цепочке createEvent).
     */
    private async processResourceEntries(entries: PerformanceEntry[]): Promise<void> {
        if (this.config.disabled) {
            return;
        }

        const resources = entries
            .filter((e): e is PerformanceResourceTiming => e.entryType === 'resource')
            .filter(this.validatePerformanceEntry);

        const pendingPushes: Array<Promise<WebTelemetryBaseEvent>> = [];

        for (const res of resources) {
            /**
             * Эта проверка необходима чтобы `PerformanceObserver` не тригерился
             * на отправку данных в бекенд. Если этого не сделать, то шедулер будет
             * бесконечно планировать отправку данных после любой отправки данных
             */
            if (res.name && this.config.endpoint && res.name.includes(this.config.endpoint)) {
                continue;
            }

            const resData =
                'toJSON' in res && typeof res.toJSON === 'function'
                    ? (res.toJSON() as Record<string, unknown>)
                    : (res as unknown as Record<string, unknown>);

            const evt: WebTelemetryResourcesData = {
                hostname: typeof window !== 'undefined' ? window.location.hostname : '',
                project: this.name,
                path: typeof window !== 'undefined' ? window.location.href : '',
            };

            for (const entryName of FIELDS_TO_EXTRACT) {
                const value = resData[entryName];
                if (value) {
                    evt[entryName] = typeof value === 'number' ? Math.round(value) : (value as string);
                }
            }

            pendingPushes.push(this.push(evt));
        }

        await Promise.all(pendingPushes);
    }

    payloadToJSON(payload: WebTelemetryResourcesData) {
        return payload;
    }

    /**
     * После `load` останавливаем наблюдение за ресурсами, если не запрошено продолжение.
     */
    private finalizeAfterDocumentReady(): void {
        if (this.observeResourcesAfterLoad || typeof window === 'undefined') {
            return;
        }

        if (document.readyState === 'complete') {
            void this.finalizeShutdown();
        } else {
            window.addEventListener('load', this.boundLoadFinalizer, { once: true });
        }
    }

    private async finalizeShutdown(): Promise<void> {
        if (this.sharedShutdownPromise) {
            await this.sharedShutdownPromise;
            this.flushBufferedEvents();
            return;
        }

        this.sharedShutdownPromise = (async () => {
            try {
                await this.shutdownObservation();
            } catch (error) {
                console.error(error);
            }
        })();

        try {
            await this.sharedShutdownPromise;
        } finally {
            this.sharedShutdownPromise = null;
        }
    }

    /**
     * Единый путь остановки: снять слушатель `load`, дочитать очередь observer,
     * обработать записи, сбросить буфер событий, отключить observer.
     */
    private async shutdownObservation(): Promise<void> {
        if (this.hasShutDown) {
            this.flushBufferedEvents();
            return;
        }

        if (typeof window !== 'undefined') {
            window.removeEventListener('load', this.boundLoadFinalizer);
        }

        const obs = WebTelemetryResources.observer;

        if (obs && this.isObservationStarted) {
            let batch: PerformanceEntry[];
            do {
                batch = obs.takeRecords();
                if (batch.length > 0) {
                    await this.processResourceEntries(batch);
                }
            } while (batch.length > 0);

            this.flushBufferedEvents();
            obs.disconnect();
            this.isObservationStarted = false;
        }

        this.flushBufferedEvents();
        this.hasShutDown = true;
    }

    public start() {
        if (this.isObservationStarted) {
            return;
        }

        this.hasShutDown = false;

        try {
            if (WebTelemetryResources.observer) {
                WebTelemetryResources.observer.observe({
                    type: 'resource',
                    buffered: true,
                });
                this.isObservationStarted = true;
                this.finalizeAfterDocumentReady();
            }
            // eslint-disable-next-line no-empty
        } catch (_e) {}
    }

    public async end(): Promise<void> {
        await this.finalizeShutdown();
    }
}
