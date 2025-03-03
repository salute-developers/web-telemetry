import { describe, it, expect, beforeEach } from 'vitest';

import { WebTelemetryAddon } from './types';
import { WebTelemetryBase } from './WebTelemetryBase';

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

class WebTelemetry<T> extends WebTelemetryBase<T, T> {
    protected payloadToJSON(payload: T): T {
        return payload;
    }

    protected scheduleSend() {
        // do nothing
    }

    public getEvents() {
        return this.events;
    }
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

        it('should merge data and metadata', () => {
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

            instance.push({ data: 'data' }, { metadata: 'metadata' });
            const { metadata, ...actualData } = instance.getEvents()[0];

            expect(actualData).toMatchObject(expectedData);

            const actualMetadata = metadata && JSON.parse(metadata);
            expect(actualMetadata).toMatchObject(expectedMetadata);
        });
    });
});
