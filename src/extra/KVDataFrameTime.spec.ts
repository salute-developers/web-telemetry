import { vi } from 'vitest';
import { WebTelemetryKV } from '../presets/WebTelemetryKV';
import { WebTelemetryTransport } from '../types';
import { KVDataFrameTime, MinFrameTreshold } from './KVDataFrameTime';

const fakeTransport = new (class implements WebTelemetryTransport {
    subscriber: Promise<string> = Promise.resolve('');
    handler: (data: any) => void = () => {};

    constructor() {
        this.subscriber = new Promise((res) => {
            this.handler = res;
        });
    }

    send(body: string) {
        this.handler(body);
    }

    async subscribe() {
        return this.subscriber;
    }
})();

const kv = new WebTelemetryKV({ projectName: 'test' }, [fakeTransport]);
const kvDataFrameTime = new KVDataFrameTime(kv);

function mix(v0: number, v1: number, t: number) {
    return v0 + (v1 - v0) * t;
}

function calculateQuantile1(data: number[]): number {
    const quantileDevisor = 100;
    const sortedData = [...data].sort((a, b) => (a > b ? -1 : 1));
    const index = (sortedData.length - 1) / quantileDevisor;
    const t = (index % quantileDevisor) / quantileDevisor;
    const lowIndex = Math.trunc(index);

    if (t === 0) {
        return sortedData[lowIndex];
    }

    return mix(sortedData[lowIndex], sortedData[lowIndex + 1], t);
}

let rafCounter = 0;
let endCallback: (() => void) | null = null;

describe('KVDataFrameTime', () => {
    beforeEach(() => {
        rafCounter = 0;

        global.performance.now = vi.fn();

        vi.spyOn(document, 'addEventListener').mockImplementation((_, callback) => {
            endCallback = callback as any;
        });
    });

    it('should frame time avg and 1% works correctly', async () => {
        const rafCallLimit = MinFrameTreshold + Math.ceil(Math.random() * 1000);
        /*
            моковые данные для performance.now() - каждое следующее значение должо быть больше предыдущего.
            количество вызовов performance.now() будет на 1 больше, чем количество рассчетов frameTime
        */
        const performanceData = new Array(rafCallLimit + 1).fill(0).map((_, i) => i ** 2);
        let performanceCallCounter = 0;

        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            if (rafCounter++ === rafCallLimit && endCallback) {
                endCallback();

                return 0;
            }

            setTimeout(() => {
                cb(performanceData[performanceCallCounter++]);
            });

            return 0;
        });

        global.performance.now = vi.fn(() => {
            return performanceData[performanceCallCounter++];
        });

        kvDataFrameTime.startMonitoring();
        const data = JSON.parse(await fakeTransport.subscribe());
        const avg = data.find((x: any) => x.key === 'AvgFrameTime');
        const firstQuantile = data.find((x: any) => x.key === '1%FrameTime');

        const frameTimeArr = performanceData.slice(rafCallLimit * -1).map((x, i, arr) => {
            if (i === 0) return x;
            return x - arr[i - 1];
        });

        expect(avg.valueNum).toBe(frameTimeArr.reduce((a, b) => a + b) / rafCallLimit);
        expect(firstQuantile.valueNum).toBe(calculateQuantile1(frameTimeArr));
    });
});
