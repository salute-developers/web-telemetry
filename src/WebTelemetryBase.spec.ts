import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import type { WebTelemetryAddon, WebTelemetryBaseEvent } from './types.js';
import { WebTelemetryBase } from './WebTelemetryBase.js';

class Addon1 implements WebTelemetryAddon<{ addon1Data: string }, { addon1Metadata: string }> {
    data() {
        return { addon1Data: 'addon1Data' };
    }

    metadata() {
        return { addon1Metadata: 'addon1Metadata' };
    }
}

class Addon2 implements WebTelemetryAddon<{ addon2Data: string }, { addon2Metadata: string }> {
    data() {
        return { addon2Data: 'addon2Data' };
    }

    metadata() {
        return { addon2Metadata: 'addon2Metadata' };
    }
}

class WebTelemetry<T extends object> extends WebTelemetryBase<T, T> {
    protected payloadToJSON(payload: T): T {
        return payload;
    }

    protected override scheduleSend() {
        // do nothing
    }

    public getEvents(): Array<WebTelemetryBaseEvent & T> {
        return this.events as Array<WebTelemetryBaseEvent & T>;
    }
}

class WebTelemetryBatch<T extends object> extends WebTelemetryBase<T, T> {
    protected payloadToJSON(payload: T): T {
        return payload;
    }
}

function setDocumentVisibility(visibilityState: DocumentVisibilityState) {
    Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: visibilityState,
    });
    document.dispatchEvent(new Event('visibilitychange'));
}

describe('WebTelemetryBase', () => {
    describe('addons', () => {
        let instance: WebTelemetry<any>;

        beforeEach(() => {
            instance = new WebTelemetry(
                {
                    projectName: 'project-name',
                    debug: true,
                },
                [new Addon1(), new Addon2()],
            );
        });

        it('should merge data and metadata', async () => {
            const expectedData = {
                data: 'data',
                addon1Data: 'addon1Data',
                addon2Data: 'addon2Data',
            };

            const expectedMetadata = {
                metadata: 'metadata',
                addon1Metadata: 'addon1Metadata',
                addon2Metadata: 'addon2Metadata',
            };

            await instance.push({ data: 'data' }, { metadata: 'metadata' });
            const { metadata, ...actualData } = instance.getEvents()[0];

            expect(actualData).toMatchObject(expectedData);

            const actualMetadata = metadata && JSON.parse(metadata);
            expect(actualMetadata).toMatchObject(expectedMetadata);
        });
    });

    describe('queue overflow', () => {
        it('drops oldest events when queue is over maxQueueSize', async () => {
            const instance = new WebTelemetry<{ data: string }>(
                {
                    projectName: 'project-name',
                    debug: true,
                    maxQueueSize: 2,
                    queueOverflowStrategy: 'drop_oldest',
                },
                [],
            );

            await instance.push({ data: 'first' });
            await instance.push({ data: 'second' });
            await instance.push({ data: 'third' });

            expect(instance.getEvents().map((event) => event.data)).toEqual(['second', 'third']);
            expect(instance.droppedEventsCount).toBe(1);
        });

        it('drops newest events when queue is over maxQueueSize', async () => {
            const instance = new WebTelemetry<{ data: string }>(
                {
                    projectName: 'project-name',
                    debug: true,
                    maxQueueSize: 2,
                    queueOverflowStrategy: 'drop_newest',
                },
                [],
            );

            await instance.push({ data: 'first' });
            await instance.push({ data: 'second' });
            await instance.push({ data: 'third' });

            expect(instance.getEvents().map((event) => event.data)).toEqual(['first', 'second']);
            expect(instance.droppedEventsCount).toBe(1);
        });
    });

    describe('visibility and freeze', () => {
        afterEach(() => {
            vi.useRealTimers();
            setDocumentVisibility('visible');
        });

        it('sends while document is hidden by default', async () => {
            const send = vi.fn();
            const transport = { send };

            const instance = new WebTelemetryBatch(
                {
                    projectName: 'project-name',
                    debug: false,
                    delay: 50,
                    buffSize: 1,
                },
                [],
                [transport],
            );

            setDocumentVisibility('hidden');

            await instance.push({ data: 'data' });

            expect(send).toHaveBeenCalledTimes(1);
        });

        it('does not call transport while document is hidden; flushes after visible', async () => {
            const send = vi.fn();
            const transport = { send };

            const instance = new WebTelemetryBatch(
                {
                    projectName: 'project-name',
                    debug: false,
                    delay: 50,
                    buffSize: 1,
                    pauseSendingWhenPageInactive: true,
                },
                [],
                [transport],
            );

            setDocumentVisibility('hidden');

            await instance.push({ data: 'data' });

            expect(send).not.toHaveBeenCalled();

            setDocumentVisibility('visible');

            expect(send).toHaveBeenCalledTimes(1);
        });

        it('sends pushListAndSend events immediately while document is hidden', async () => {
            const send = vi.fn();
            const transport = { send };

            const instance = new WebTelemetryBatch(
                {
                    projectName: 'project-name',
                    debug: false,
                    pauseSendingWhenPageInactive: true,
                },
                [],
                [transport],
            );

            setDocumentVisibility('hidden');

            await instance.pushListAndSend([{ payload: { data: 'data' } }]);

            expect(send).toHaveBeenCalledTimes(1);
        });

        it('clears scheduled send on freeze and sends after resume', async () => {
            vi.useFakeTimers();

            const send = vi.fn();
            const transport = { send };

            const instance = new WebTelemetryBatch(
                {
                    projectName: 'project-name',
                    debug: false,
                    delay: 100,
                    buffSize: 100,
                    pauseSendingWhenPageInactive: true,
                },
                [],
                [transport],
            );

            await instance.push({ data: 'data' });

            document.dispatchEvent(new Event('freeze'));

            vi.advanceTimersByTime(500);
            expect(send).not.toHaveBeenCalled();

            document.dispatchEvent(new Event('resume'));

            vi.advanceTimersByTime(100);
            expect(send).toHaveBeenCalledTimes(1);
        });
    });
});
