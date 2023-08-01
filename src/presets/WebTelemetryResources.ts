import { WebTelemetryResourcesConfig, WebTelemetryTransport } from '../types';
import { WebTelemetryBase } from '../WebTelemetryBase';

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

const PERMANENT_URLS_BLACKLIST = [/api\.amplitude\.com/, /ingest\.sentry\.io/, /mc\.yandex\.ru/];

export const validatePerformanceEntry = (...args: RegExp[][]) => {
    const flatArgs = args.flat();
    return (entry: PerformanceEntry) => {
        const testFn = (regEx: RegExp) => !regEx.test(entry.name);
        return flatArgs.every(testFn);
    };
};

interface WebTelemetryResourcesData extends Partial<Record<typeof FIELDS_TO_EXTRACT[number], string | number>> {
    hostname: string;
    project: string;
    path: string;
}

export class WebTelemetryResources extends WebTelemetryBase<WebTelemetryResourcesData, WebTelemetryResourcesData> {
    private name: string;

    private static observer: PerformanceObserver | undefined;
    private validatePerformanceEntry;
    private isObservationStarted: boolean = false;

    constructor(name: string, config: WebTelemetryResourcesConfig, transports?: Array<WebTelemetryTransport>) {
        super(config, [], transports);

        this.validatePerformanceEntry = validatePerformanceEntry(
            PERMANENT_URLS_BLACKLIST,
            config.resourcesBlackList || [],
        );
        this.name = name;

        const handler = this.handler.bind(this);

        if (window.PerformanceObserver && !WebTelemetryResources.observer) {
            WebTelemetryResources.observer = new PerformanceObserver(handler);
        }
    }

    private handler(entryList: PerformanceObserverEntryList) {
        if (this.config.disabled) {
            return;
        }

        const resources = entryList.getEntriesByType('resource').filter(this.validatePerformanceEntry);
        for (const res of resources) {
            /**
             * Эта проверка необходима чтобы `PerformanceObserver` не тригерился
             * на отправку данных в бекенд. Если этого не сделать, то шедулер будет
             * бесконечно планировать отправку данных после любой отправки данных
             */
            if (res.name && this.config.endpoint && res.name.includes(this.config.endpoint)) {
                // eslint-disable-next-line no-continue
                continue;
            }

            const resData = res.toJSON ? res.toJSON() : {};

            const evt: WebTelemetryResourcesData = {
                hostname: window.location.hostname,
                project: this.name,
                path: window.location.href,
            };

            for (const entryName of FIELDS_TO_EXTRACT) {
                const value = resData[entryName];
                if (value) {
                    evt[entryName] = typeof value === 'number' ? Math.round(value) : value;
                }
            }

            this.push(evt);
        }
    }

    payloadToJSON(payload: WebTelemetryResourcesData) {
        return payload;
    }

    public start() {
        if (this.isObservationStarted) {
            return;
        }
        try {
            if (WebTelemetryResources.observer) {
                WebTelemetryResources.observer.observe({ type: 'resource', buffered: true });
                this.isObservationStarted = true;
            }
            // eslint-disable-next-line no-empty
        } catch (e) {}
    }

    public end() {
        if (WebTelemetryResources.observer) {
            WebTelemetryResources.observer.disconnect();
            this.isObservationStarted = false;
        }
    }
}
