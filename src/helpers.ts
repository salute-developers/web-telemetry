export function stringifyCircularObj(obj: any) {
    const cache: Record<any, any>[] = [];
    const str = JSON.stringify(obj, (_key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (cache.includes(value)) {
                return;
            }
            cache.push(value);
        }

        return value;
    });

    return str;
}

import type {
    CLSMetricWithAttribution,
    FCPMetricWithAttribution,
    INPMetricWithAttribution,
    LCPMetricWithAttribution,
} from 'web-vitals/attribution';

type WebVitalsMetricWithAttribution =
    | LCPMetricWithAttribution
    | INPMetricWithAttribution
    | CLSMetricWithAttribution
    | FCPMetricWithAttribution;

export function sanitizeAttribution(metric: WebVitalsMetricWithAttribution) {
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
        default: {
            return metric;
        }
    }
}

