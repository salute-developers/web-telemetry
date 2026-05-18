import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WebTelemetryResources, validatePerformanceEntry, VIDEO_URLs } from './WebTelemetryResources.js';

type ResourceEntry = PerformanceEntry & {
    toJSON(): Record<string, string | number>;
};

class MockPerformanceObserver {
    static instance: MockPerformanceObserver | undefined;
    static bufferedEntries: PerformanceEntry[] = [];

    disconnected = false;
    private callback: PerformanceObserverCallback;
    private records: PerformanceEntry[] = [];

    constructor(callback: PerformanceObserverCallback) {
        this.callback = callback;
        MockPerformanceObserver.instance = this;
    }

    observe(options: PerformanceObserverInit) {
        if (options.type === 'resource' && options.buffered) {
            this.records.push(...MockPerformanceObserver.bufferedEntries);
            MockPerformanceObserver.bufferedEntries = [];
        }
    }

    disconnect() {
        this.disconnected = true;
    }

    takeRecords() {
        const records = [...this.records];
        this.records = [];
        return records;
    }

    emit(entries: PerformanceEntry[]) {
        if (this.disconnected) {
            return;
        }

        const entryList = {
            getEntries: () => entries,
            getEntriesByName: () => [],
            getEntriesByType: (type: string) => (type === 'resource' ? entries : []),
        } as PerformanceObserverEntryList;

        this.callback(entryList, this as unknown as PerformanceObserver);
    }

    queue(entries: PerformanceEntry[]) {
        this.records.push(...entries);
    }
}

const originalPerformanceObserver = window.PerformanceObserver;

function setPerformanceObserver(value: typeof PerformanceObserver | undefined) {
    Object.defineProperty(window, 'PerformanceObserver', {
        configurable: true,
        writable: true,
        value,
    });
}

function setReadyState(value: DocumentReadyState) {
    Object.defineProperty(document, 'readyState', {
        configurable: true,
        value,
    });
}

function createResourceEntry(name: string, values: Record<string, string | number> = {}): ResourceEntry {
    return {
        name,
        entryType: 'resource',
        startTime: 0,
        duration: 0,
        toJSON: () => ({
            name,
            entryType: 'resource',
            ...values,
        }),
    } as ResourceEntry;
}

async function flushMicrotasks() {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
}

describe('presets', () => {
    beforeEach(() => {
        MockPerformanceObserver.instance = undefined;
        MockPerformanceObserver.bufferedEntries = [];
        setPerformanceObserver(MockPerformanceObserver as unknown as typeof PerformanceObserver);
        (WebTelemetryResources as unknown as { observer?: PerformanceObserver }).observer = undefined;
    });

    afterEach(() => {
        vi.useRealTimers();
        Reflect.deleteProperty(document, 'readyState');
        setPerformanceObserver(originalPerformanceObserver);
        (WebTelemetryResources as unknown as { observer?: PerformanceObserver }).observer = undefined;
    });

    describe('WebTelemetryResources:validatePerformanceEntry', () => {
        const firstBlackList = [
            /api\.amplitude\.com/,
            /ingest\.sentry\.io/,
            /mc\.yandex\.ru/,
            /gt\.andata\.ru/,
            /top-fwz1\.mail\.ru/,
            VIDEO_URLs,
        ];
        const secondBlackList = [/img\.smotreshka\.tv/, /static\.okko\.tv/];

        const validator = validatePerformanceEntry(firstBlackList, secondBlackList);

        const desiredEntres = [
            { name: 'https://yandex.ru/' },
            { name: ' http://static.appercode.com/sbercode/quest/leader.html' },
            { name: ' http://static.appercode.com/my_ump4.jpg' },
        ] as PerformanceEntry[];

        const unadvisableEntres = [
            { name: 'https://ingest.sentry.io/' },
            { name: 'https://api.amplitude.com/' },
            {
                name: 'https://static.okko.tv/images/v2/17213101?size=784x456&quality=75',
            },
            {
                name: 'http://img.smotreshka.tv/image/aHR0cDovL2ltZy5iNjEyLnRpZ2h0dmlkZW8uY29tL2NoYW5uZWxzL2themFraF90dl9uZXcucG5n?width=784&height=456',
            },
            {
                name: 'https://mc.yandex.ru/webvisor/87707055?wmode=0&wv-part=24',
            },
            {
                name: 'https://example.com/my-video.mp4',
            },
            {
                name: 'https://gt.andata.ru/com.snowplowanalytics.snowplow/tp2',
            },
            {
                name: 'https://top-fwz1.mail.ru/tracker?_0',
            },
        ] as PerformanceEntry[];

        const mixedEntres = [...desiredEntres, ...unadvisableEntres];

        it('passed all entries that does not match', () => {
            expect(desiredEntres.filter(validator)).toEqual(desiredEntres);
        });

        it('filtered out unadvisable entres', () => {
            expect(unadvisableEntres.filter(validator)).toEqual([]);
        });

        it('filtered out entrys if them is in one of the lists', () => {
            expect(mixedEntres.filter(validator)).toEqual(desiredEntres);
        });
    });

    describe('WebTelemetryResources:document ready', () => {
        it('when observeResourcesAfterLoad is false, flushes on load and stops further observation', async () => {
            vi.useFakeTimers();
            setReadyState('loading');

            const send = vi.fn();
            const telemetry = new WebTelemetryResources(
                'test-project',
                {
                    projectName: 'test-project-resources',
                    endpoint: 'https://telemetry.example.com',
                    delay: 1_000,
                    buffSize: 10,
                    debug: false,
                    observeResourcesAfterLoad: false,
                },
                [{ send }],
            );

            telemetry.start();

            const observer = MockPerformanceObserver.instance;

            expect(observer).toBeDefined();

            observer?.emit([createResourceEntry('https://static.example.com/app.js', { duration: 21 })]);
            await flushMicrotasks();

            observer?.queue([createResourceEntry('https://static.example.com/app.css', { duration: 31 })]);

            expect(send).not.toHaveBeenCalled();

            setReadyState('complete');
            window.dispatchEvent(new Event('load'));
            await flushMicrotasks();

            expect(observer?.disconnected).toBe(true);
            expect(send).toHaveBeenCalledTimes(1);

            const payload = JSON.parse(send.mock.calls[0][0]);

            expect(payload).toHaveLength(2);
            expect(payload.map((entry: { name: string }) => entry.name)).toEqual([
                'https://static.example.com/app.js',
                'https://static.example.com/app.css',
            ]);

            vi.advanceTimersByTime(1_000);
            await flushMicrotasks();

            expect(send).toHaveBeenCalledTimes(1);

            observer?.emit([createResourceEntry('https://static.example.com/late.js', { duration: 12 })]);
            await flushMicrotasks();

            expect(send).toHaveBeenCalledTimes(1);
        });

        it('when observeResourcesAfterLoad is false, flushes buffered resources immediately if document already complete', async () => {
            setReadyState('complete');
            MockPerformanceObserver.bufferedEntries = [
                createResourceEntry('https://static.example.com/font.woff2', { duration: 14 }),
            ];

            const send = vi.fn();
            const telemetry = new WebTelemetryResources(
                'test-project',
                {
                    projectName: 'test-project-resources',
                    endpoint: 'https://telemetry.example.com',
                    delay: 1_000,
                    buffSize: 10,
                    debug: false,
                    observeResourcesAfterLoad: false,
                },
                [{ send }],
            );

            telemetry.start();
            await flushMicrotasks();

            const observer = MockPerformanceObserver.instance;

            expect(observer?.disconnected).toBe(true);
            expect(send).toHaveBeenCalledTimes(1);

            const payload = JSON.parse(send.mock.calls[0][0]);

            expect(payload).toHaveLength(1);
            expect(payload[0].name).toBe('https://static.example.com/font.woff2');
        });

        it('by default continues collecting resources after load', async () => {
            vi.useFakeTimers();
            setReadyState('loading');

            const send = vi.fn();
            const telemetry = new WebTelemetryResources(
                'test-project',
                {
                    projectName: 'test-project-resources',
                    endpoint: 'https://telemetry.example.com',
                    delay: 1_000,
                    buffSize: 10,
                    debug: false,
                },
                [{ send }],
            );

            telemetry.start();

            const observer = MockPerformanceObserver.instance;

            expect(observer).toBeDefined();

            observer?.emit([createResourceEntry('https://static.example.com/app.js', { duration: 21 })]);
            await flushMicrotasks();

            setReadyState('complete');
            window.dispatchEvent(new Event('load'));
            await flushMicrotasks();

            expect(observer?.disconnected).toBe(false);

            observer?.emit([createResourceEntry('https://static.example.com/late.js', { duration: 12 })]);
            await flushMicrotasks();

            vi.advanceTimersByTime(1_000);
            await flushMicrotasks();

            expect(send).toHaveBeenCalledTimes(1);

            const payload = JSON.parse(send.mock.calls[0][0]);

            expect(payload.map((entry: { name: string }) => entry.name)).toEqual([
                'https://static.example.com/app.js',
                'https://static.example.com/late.js',
            ]);
        });

        it('flushes observer records on manual end before disconnect', async () => {
            setReadyState('loading');

            const send = vi.fn();
            const telemetry = new WebTelemetryResources(
                'test-project',
                {
                    projectName: 'test-project-resources',
                    endpoint: 'https://telemetry.example.com',
                    delay: 1_000,
                    buffSize: 10,
                    debug: false,
                },
                [{ send }],
            );

            telemetry.start();

            const observer = MockPerformanceObserver.instance;

            observer?.queue([createResourceEntry('https://static.example.com/manual-end.js', { duration: 44 })]);

            await telemetry.end();

            expect(observer?.disconnected).toBe(true);
            expect(send).toHaveBeenCalledTimes(1);

            const payload = JSON.parse(send.mock.calls[0][0]);

            expect(payload).toHaveLength(1);
            expect(payload[0].name).toBe('https://static.example.com/manual-end.js');
        });
    });
});
