import { onCLS, onFCP, onINP, onLCP } from 'web-vitals/attribution';
import type {
    CLSMetricWithAttribution,
    FCPMetricWithAttribution,
    INPMetricWithAttribution,
    LCPMetricWithAttribution,
} from 'web-vitals/attribution';

import type { WebTelemetryKV } from './presets/WebTelemetryKV.js';

type WebVitalsMetricWithAttribution =
    | LCPMetricWithAttribution
    | INPMetricWithAttribution
    | CLSMetricWithAttribution
    | FCPMetricWithAttribution;

type INPAttributionReportOpts = NonNullable<Parameters<typeof onINP>[1]> & {
    includeProcessedEventEntries: false;
};

function sanitizeAttribution(metric: WebVitalsMetricWithAttribution) {
    switch (metric.name) {
        case 'INP': {
            const {
                interactionTarget,
                interactionType,
                interactionTime,
                nextPaintTime,
                inputDelay,
                processingDuration,
                presentationDelay,
                loadState,
            } = metric.attribution;

            return {
                interactionTarget,
                interactionType,
                interactionTime,
                nextPaintTime,
                inputDelay,
                processingDuration,
                presentationDelay,
                loadState,
            };
        }
        case 'LCP': {
            const { target, url, timeToFirstByte, resourceLoadDelay, resourceLoadDuration, elementRenderDelay } =
                metric.attribution;

            return {
                target,
                url,
                timeToFirstByte,
                resourceLoadDelay,
                resourceLoadDuration,
                elementRenderDelay,
            };
        }
        case 'CLS': {
            const { largestShiftTarget, largestShiftTime, largestShiftValue, loadState } = metric.attribution;

            return {
                largestShiftTarget,
                largestShiftTime,
                largestShiftValue,
                loadState,
            };
        }
        case 'FCP': {
            const { timeToFirstByte, firstByteToFCP, loadState } = metric.attribution;

            return {
                timeToFirstByte,
                firstByteToFCP,
                loadState,
            };
        }
    }
}

export function registerWebVitals(KV: Pick<WebTelemetryKV, 'push'>, mode: 'webApp' | 'canvas'): void {
    [onLCP, onCLS, onFCP].forEach((getMetric) => {
        getMetric((metric) => KV.push({ key: metric.name, value: metric.value }, sanitizeAttribution(metric)));
    });

    const inpOpts: INPAttributionReportOpts & { includeLongAnimationFrameEntries?: false } = {
        includeProcessedEventEntries: false,
        ...(mode === 'canvas' ? { includeLongAnimationFrameEntries: false } : {}),
    };

    onINP((metric) => KV.push({ key: metric.name, value: metric.value }, sanitizeAttribution(metric)), inpOpts);
}
