import type { WebTelemetryResourcesConfig, WebTelemetryTransport } from '../types.js';
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

const PERMANENT_URLS_BLACKLIST = [/api\.amplitude\.com/, /ingest\.sentry\.io/, /mc\.yandex\.ru/, /gt\.andata\.ru/, /sentry-api\.sberdevices\.ru/, /top-fvz1\.mail\.ru/, VIDEO_URLs];

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
                WebTelemetryResources.observer.observe({
                    type: 'resource',
                    buffered: true,
                });
                this.isObservationStarted = true;
            }
            // eslint-disable-next-line no-empty
        } catch (_e) {}
    }

    public end() {
        if (WebTelemetryResources.observer) {
            WebTelemetryResources.observer.disconnect();
            this.isObservationStarted = false;
        }
    }
}
