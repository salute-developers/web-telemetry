import Timers from 'node:timers/promises';
import { WebTelemetryKV } from './WebTelemetryKV';

describe('presets', () => {
    describe('WebTelemetryKV', () => {
        let inst: WebTelemetryKV;

        beforeEach(() => {
            inst = new WebTelemetryKV({
                projectName: 'projectName',
                debug: true,
            });
        });

        it('should use metadata', async () => {
            const evt = await inst.push({ key: 'a', value: 'b' }, { x: 1, y: 2, z: '3' });

            expect(JSON.parse(evt.metadata)).toMatchObject({
                x: 1,
                y: 2,
                z: '3',
            });
        });

        it('should return valid data for string value', async () => {
            const evt = await inst.push({ key: 'test', value: 'hello' });

            expect(evt).toMatchObject({
                key: 'test',
                valueStr: 'hello',
            });
        });

        it('should return valid data for number value', async () => {
            const evt = await inst.push({ key: 'test', value: 42 });

            expect(evt).toMatchObject({
                key: 'test',
                valueNum: 42,
            });
        });

        it('should return valid data for boolean value', async () => {
            const evt = await inst.push({ key: 'test', value: true });

            expect(evt).toMatchObject({
                key: 'test',
                valueBool: true,
            });
        });

        it('should create span', async () => {
            const span = inst.createSpan('span');

            await Timers.scheduler.wait(1500);

            const duration = span.end();

            expect(duration).toBeGreaterThanOrEqual(1500);
            expect(duration).toBeLessThan(2000);
        });
    });
});
