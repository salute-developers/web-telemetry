import type { WebTelemetryValue } from './types.js';

export type WebAppTelemetry = {
    setMetric(name: string, value: WebTelemetryValue): void;
    send(): void;
};

export type WebAppMetricsStatus = 'collecting' | 'sending' | 'sent' | 'failed';

export type WebAppMetricsState = {
    status: WebAppMetricsStatus;
    missingMetrics: Array<string>;
};

export type GetWebAppTelemetry = () => WebAppTelemetry | Promise<WebAppTelemetry>;

export type WebAppMetricsOptions = {
    requiredMetrics: Array<string>;
    getTelemetry: GetWebAppTelemetry;
    onError?: (error: unknown) => void;
};

export type WebAppMetricValues = Record<string, WebTelemetryValue | undefined>;

export type WebAppMetrics = {
    setMetrics(values: WebAppMetricValues): void;
    getStatus(): WebAppMetricsState;
};

export const createWebAppMetrics = (options: WebAppMetricsOptions): WebAppMetrics => {
    const { requiredMetrics, getTelemetry, onError } = options;

    if (requiredMetrics.length === 0) {
        throw new Error('createWebAppMetrics: requiredMetrics must be a non-empty array');
    }

    let status: WebAppMetricsStatus = 'collecting';
    const collected = new Map<string, WebTelemetryValue>();
    const required = new Set(requiredMetrics);
    let snapshot: Record<string, WebTelemetryValue>;

    const reportError = (cause: unknown) => {
        status = 'failed';

        if (onError) {
            try {
                onError(cause);
            } catch {
                return;
            }
        }
    };

    const send = async () => {
        let telemetry: WebAppTelemetry;

        try {
            telemetry = await getTelemetry();
        } catch (cause) {
            reportError(cause);
            return;
        }

        try {
            for (const [name, value] of Object.entries(snapshot)) {
                telemetry.setMetric(name, value);
            }

            telemetry.send();
            status = 'sent';
        } catch (cause) {
            reportError(cause);
        }
    };

    return {
        setMetrics(values: WebAppMetricValues) {
            if (status !== 'collecting') {
                return;
            }

            for (const name of Object.keys(values)) {
                const value = values[name];

                if (value !== undefined) {
                    collected.set(name, value);
                }
            }

            for (const name of required) {
                if (!collected.has(name)) {
                    return;
                }
            }

            status = 'sending';
            snapshot = Object.fromEntries(collected);

            void send();
        },
        getStatus() {
            if (status === 'collecting') {
                const missingMetrics = [...required].filter((name) => !collected.has(name));

                return { status, missingMetrics };
            }

            return { status, missingMetrics: [] };
        },
    };
};
