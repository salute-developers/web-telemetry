import { WebTelemetryKV } from '../presets/WebTelemetryKV';
import { KVDataItem, WebTelemetryKVData } from '../types';

export const MinFrameTreshold = 1000;

export class KVDataFrameTime implements WebTelemetryKVData {
    frameTimeCounter = 0;
    frameCounter = 0;
    rafId = 0;
    frameTimeMap: Record<number, number> = {};

    constructor(private KV: WebTelemetryKV) {}

    KVdata(): KVDataItem<{ key: string; value: number }>[] {
        return [
            {
                payload: {
                    key: 'AvgFrameTime',
                    value: Math.round(this.frameTimeCounter / this.frameCounter),
                },
            },
            {
                payload: {
                    key: '1%FrameTime',
                    value: this.get1Low(),
                },
            },
        ];
    }
    /*
        The linear interpolation between closest ranks method
        https://en.wikipedia.org/wiki/Percentile
    */
    get1Low(): number {
        const quantileDevisor = 100;
        const sortedKeys = Object.keys(this.frameTimeMap)
            .map(Number)
            .sort((a, b) => b - a);
        const index = (this.frameCounter - 1) / quantileDevisor;
        const lowerPercentileIndex = Math.floor(index);
        const fraction = (index % quantileDevisor) / quantileDevisor;
        let currentPercentileIndex = 0;

        for (let i = 0; i < sortedKeys.length - 1; ++i) {
            currentPercentileIndex += this.frameTimeMap[sortedKeys[i]];

            if (
                (currentPercentileIndex === lowerPercentileIndex && fraction === 0) ||
                currentPercentileIndex > lowerPercentileIndex
            ) {
                return sortedKeys[lowerPercentileIndex];
            }

            if (currentPercentileIndex === lowerPercentileIndex && fraction !== 0) {
                return (
                    sortedKeys[lowerPercentileIndex] +
                    (sortedKeys[lowerPercentileIndex + 1] - sortedKeys[lowerPercentileIndex]) * fraction
                );
            }
        }

        return sortedKeys[0];
    }

    appendFrameTime(deltaTime: number) {
        const key = Math.round(deltaTime);

        this.frameCounter++;
        this.frameTimeCounter += deltaTime;

        if (this.frameTimeMap[key] === undefined) {
            this.frameTimeMap[key] = 1;
            return;
        }

        this.frameTimeMap[key]++;
    }

    startMonitoring() {
        let prevTimer = performance.now();

        const callback = (currentTime: DOMHighResTimeStamp) => {
            const deltaTime = currentTime - prevTimer;
            this.appendFrameTime(deltaTime);

            prevTimer = currentTime;
            this.rafId = requestAnimationFrame(callback);
        };

        this.rafId = requestAnimationFrame(callback);

        document.addEventListener(
            'visibilitychange',
            () => {
                if (this.frameCounter > MinFrameTreshold) {
                    this.KV.pushListAndSend(this.KVdata());
                }
                this.endMonitoring();
            },
            { once: true },
        );
    }

    endMonitoring() {
        cancelAnimationFrame(this.rafId);
    }
}
