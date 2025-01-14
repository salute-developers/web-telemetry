import { WebTelemetryAddon } from './types';
import { WebTelemetryBase } from './WebTelemetryBase';

class Addon1 implements WebTelemetryAddon<{ addon1Data: string }, { addon1Metadata: string }> {
    data() {
        return Promise.resolve({ addon1Data: 'addon1Data' });
    }

    metadata() {
        return Promise.resolve({ addon1Metadata: 'addon1Metadata' });
    }
}

class Addon2 implements WebTelemetryAddon<{ addon2Data: string }, { addon2Metadata: string }> {
    data() {
        return Promise.resolve({ addon2Data: 'addon2Data' });
    }

    metadata() {
        return Promise.resolve({ addon2Metadata: 'addon2Metadata' });
    }
}

class WebTelemetry<T> extends WebTelemetryBase<T, T> {
    protected payloadToJSON(payload: T): T {
        return payload;
    }

    protected async scheduleSend() {
        // do nothing
    }

    public getEvents() {
        return this.resolvedEvents;
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
});
