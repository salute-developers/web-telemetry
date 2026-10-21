import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWebAppMetrics } from './createWebAppMetrics.js';
import type { WebAppTelemetry } from './createWebAppMetrics.js';

type Deferred<T> = {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (cause: unknown) => void;
};

const createDeferred = <T>(): Deferred<T> => {
    let resolve!: (value: T) => void;
    let reject!: (cause: unknown) => void;

    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
};

const createFakeTelemetry = () => {
    const telemetry: WebAppTelemetry = {
        setMetric: vi.fn(),
        send: vi.fn(),
    };

    return telemetry;
};

const flushMicrotasks = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('createWebAppMetrics', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('rejects empty requiredMetrics synchronously', () => {
        expect(() =>
            createWebAppMetrics({
                requiredMetrics: [],
                getTelemetry: () => createFakeTelemetry(),
            }),
        ).toThrow(/requiredMetrics/);
    });

    it('does not call the loader until all required fields arrive', async () => {
        const getTelemetry = vi.fn(() => createFakeTelemetry());

        const metrics = createWebAppMetrics({
            requiredMetrics: ['FMP', 'page'],
            getTelemetry,
        });

        metrics.setMetrics({ FMP: 100 });

        expect(getTelemetry).not.toHaveBeenCalled();
        expect(metrics.getStatus()).toEqual({ status: 'collecting', missingMetrics: ['page'] });
    });

    it('sends one complete event regardless of field arrival order', async () => {
        for (const order of [
            ['render', 'fmp', 'page'],
            ['page', 'render', 'fmp'],
            ['fmp', 'page', 'render'],
        ] as const) {
            const telemetry = createFakeTelemetry();

            const metrics = createWebAppMetrics({
                requiredMetrics: ['reactRenderStart', 'FMP', 'page'],
                getTelemetry: () => telemetry,
            });

            const values: Record<string, number | string> = {
                render: 1,
                fmp: 2,
                page: 'home',
            };
            const names: Record<string, string> = {
                render: 'reactRenderStart',
                fmp: 'FMP',
                page: 'page',
            };

            for (const key of order) {
                metrics.setMetrics({ [names[key]]: values[key] });
            }

            await flushMicrotasks();

            expect(telemetry.send).toHaveBeenCalledTimes(1);
            expect(telemetry.setMetric).toHaveBeenCalledTimes(3);
            expect(telemetry.setMetric).toHaveBeenCalledWith('reactRenderStart', 1);
            expect(telemetry.setMetric).toHaveBeenCalledWith('FMP', 2);
            expect(telemetry.setMetric).toHaveBeenCalledWith('page', 'home');
            expect(metrics.getStatus().status).toBe('sent');
        }
    });

    it('treats zero, false and empty string as present and forwards them unchanged', async () => {
        const telemetry = createFakeTelemetry();

        const metrics = createWebAppMetrics({
            requiredMetrics: ['a', 'b', 'c'],
            getTelemetry: () => telemetry,
        });

        metrics.setMetrics({ a: 0, b: false });
        expect(metrics.getStatus().status).toBe('collecting');

        metrics.setMetrics({ c: '' });
        await flushMicrotasks();

        expect(telemetry.setMetric).toHaveBeenCalledWith('a', 0);
        expect(telemetry.setMetric).toHaveBeenCalledWith('b', false);
        expect(telemetry.setMetric).toHaveBeenCalledWith('c', '');
        expect(telemetry.send).toHaveBeenCalledTimes(1);
    });

    it('ignores undefined: it does not satisfy a requirement nor erase an earlier value', async () => {
        const telemetry = createFakeTelemetry();

        const metrics = createWebAppMetrics({
            requiredMetrics: ['page'],
            getTelemetry: () => telemetry,
        });

        metrics.setMetrics({ page: undefined });
        expect(metrics.getStatus()).toEqual({ status: 'collecting', missingMetrics: ['page'] });

        metrics.setMetrics({ page: 'home', extra: undefined });
        await flushMicrotasks();

        expect(telemetry.setMetric).toHaveBeenCalledTimes(1);
        expect(telemetry.setMetric).toHaveBeenCalledWith('page', 'home');
    });

    it('uses the last value for a repeated field while collecting', async () => {
        const telemetry = createFakeTelemetry();

        const metrics = createWebAppMetrics({
            requiredMetrics: ['page', 'FMP'],
            getTelemetry: () => telemetry,
        });

        metrics.setMetrics({ page: 'first', extra: 1 });
        expect(metrics.getStatus().status).toBe('collecting');

        metrics.setMetrics({ page: 'page-2' });
        metrics.setMetrics({ FMP: 5 });
        await flushMicrotasks();

        expect(telemetry.setMetric).toHaveBeenCalledWith('page', 'page-2');
        expect(telemetry.setMetric).toHaveBeenCalledWith('extra', 1);
        expect(telemetry.send).toHaveBeenCalledTimes(1);
    });

    it('processes the whole submission before readiness check so accompanying fields are included', async () => {
        const telemetry = createFakeTelemetry();

        const metrics = createWebAppMetrics({
            requiredMetrics: ['FMP'],
            getTelemetry: () => telemetry,
        });

        metrics.setMetrics({ FMP: 42, appVersion: '1.0.0' });
        await flushMicrotasks();

        expect(telemetry.setMetric).toHaveBeenCalledWith('FMP', 42);
        expect(telemetry.setMetric).toHaveBeenCalledWith('appVersion', '1.0.0');
        expect(telemetry.send).toHaveBeenCalledTimes(1);
    });

    it('ignores late submissions, including while the loader is pending', async () => {
        const deferred = createDeferred<WebAppTelemetry>();
        const telemetry = createFakeTelemetry();

        const metrics = createWebAppMetrics({
            requiredMetrics: ['FMP'],
            getTelemetry: () => deferred.promise,
        });

        metrics.setMetrics({ FMP: 1 });
        expect(metrics.getStatus().status).toBe('sending');

        metrics.setMetrics({ FMP: 2, late: 'value' });
        expect(metrics.getStatus().status).toBe('sending');

        deferred.resolve(telemetry);
        await flushMicrotasks();

        expect(telemetry.setMetric).toHaveBeenCalledTimes(1);
        expect(telemetry.setMetric).toHaveBeenCalledWith('FMP', 1);
        expect(telemetry.send).toHaveBeenCalledTimes(1);
    });

    it('sends only once for repeated producer calls during sending', async () => {
        const deferred = createDeferred<WebAppTelemetry>();
        const telemetry = createFakeTelemetry();

        const metrics = createWebAppMetrics({
            requiredMetrics: ['FMP'],
            getTelemetry: () => deferred.promise,
        });

        metrics.setMetrics({ FMP: 1 });
        metrics.setMetrics({ FMP: 1 });

        deferred.resolve(telemetry);
        await flushMicrotasks();

        expect(telemetry.send).toHaveBeenCalledTimes(1);
    });

    it('preserves the captured event when the loader is delayed', async () => {
        const deferred = createDeferred<WebAppTelemetry>();
        const telemetry = createFakeTelemetry();

        const metrics = createWebAppMetrics({
            requiredMetrics: ['FMP', 'page'],
            getTelemetry: () => deferred.promise,
        });

        metrics.setMetrics({ FMP: 5, page: 'home', early: 'kept' });
        metrics.setMetrics({ late: 'ignored' });

        deferred.resolve(telemetry);
        await flushMicrotasks();

        expect(telemetry.setMetric).toHaveBeenCalledWith('FMP', 5);
        expect(telemetry.setMetric).toHaveBeenCalledWith('page', 'home');
        expect(telemetry.setMetric).toHaveBeenCalledWith('early', 'kept');
        expect(telemetry.setMetric).not.toHaveBeenCalledWith('late', 'ignored');
    });

    it('writes every field before the single send invocation', async () => {
        const telemetry = createFakeTelemetry();
        const calls: Array<string> = [];

        telemetry.setMetric = vi.fn((name: string) => {
            calls.push(`set:${name}`);
        });
        telemetry.send = vi.fn(() => {
            calls.push('send');
        });

        const metrics = createWebAppMetrics({
            requiredMetrics: ['FMP', 'page'],
            getTelemetry: () => telemetry,
        });

        metrics.setMetrics({ FMP: 1, page: 'home', extra: true });
        await flushMicrotasks();

        expect(calls).toEqual(['set:FMP', 'set:page', 'set:extra', 'send']);
    });

    it('supports synchronous loader returning an instance', async () => {
        const telemetry = createFakeTelemetry();

        const metrics = createWebAppMetrics({
            requiredMetrics: ['FMP'],
            getTelemetry: () => telemetry,
        });

        metrics.setMetrics({ FMP: 1 });
        await flushMicrotasks();

        expect(telemetry.send).toHaveBeenCalledTimes(1);
        expect(metrics.getStatus().status).toBe('sent');
    });

    it('fails terminally on loader rejection, notifies onError, and does not retry', async () => {
        const onError = vi.fn();
        const getTelemetry = vi.fn(() => Promise.reject(new Error('load failed')));

        const metrics = createWebAppMetrics({
            requiredMetrics: ['FMP'],
            getTelemetry,
            onError,
        });

        metrics.setMetrics({ FMP: 1 });
        await flushMicrotasks();

        expect(getTelemetry).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
        expect(metrics.getStatus().status).toBe('failed');

        metrics.setMetrics({ FMP: 2 });
        await flushMicrotasks();

        expect(getTelemetry).toHaveBeenCalledTimes(1);
        expect(metrics.getStatus().status).toBe('failed');
    });

    it('fails terminally when setMetric throws', async () => {
        const onError = vi.fn();
        const failure = new Error('write failed');
        const telemetry: WebAppTelemetry = {
            setMetric: () => {
                throw failure;
            },
            send: vi.fn(),
        };

        const metrics = createWebAppMetrics({
            requiredMetrics: ['FMP'],
            getTelemetry: () => telemetry,
            onError,
        });

        metrics.setMetrics({ FMP: 1 });
        await flushMicrotasks();

        expect(onError).toHaveBeenCalledWith(failure);
        expect(telemetry.send).not.toHaveBeenCalled();
        expect(metrics.getStatus().status).toBe('failed');
    });

    it('fails terminally when send throws', async () => {
        const onError = vi.fn();
        const failure = new Error('send failed');
        const telemetry: WebAppTelemetry = {
            setMetric: vi.fn(),
            send: () => {
                throw failure;
            },
        };

        const metrics = createWebAppMetrics({
            requiredMetrics: ['FMP'],
            getTelemetry: () => telemetry,
            onError,
        });

        metrics.setMetrics({ FMP: 1 });
        await flushMicrotasks();

        expect(onError).toHaveBeenCalledWith(failure);
        expect(metrics.getStatus().status).toBe('failed');
    });

    it('stays silent when onError is absent and no unhandled rejection occurs', async () => {
        const metrics = createWebAppMetrics({
            requiredMetrics: ['FMP'],
            getTelemetry: () => Promise.reject(new Error('load failed')),
        });

        metrics.setMetrics({ FMP: 1 });
        await flushMicrotasks();

        expect(metrics.getStatus().status).toBe('failed');
    });

    it('contains an exception thrown inside onError', async () => {
        const onError = vi.fn(() => {
            throw new Error('callback error');
        });

        const metrics = createWebAppMetrics({
            requiredMetrics: ['FMP'],
            getTelemetry: () => Promise.reject(new Error('load failed')),
            onError,
        });

        metrics.setMetrics({ FMP: 1 });
        await flushMicrotasks();

        expect(onError).toHaveBeenCalledTimes(1);
        expect(metrics.getStatus().status).toBe('failed');
    });

    it('keeps collecting indefinitely when required fields never arrive', () => {
        const getTelemetry = vi.fn(() => createFakeTelemetry());

        const metrics = createWebAppMetrics({
            requiredMetrics: ['FMP', 'page'],
            getTelemetry,
        });

        metrics.setMetrics({ unrelated: 1 });

        expect(metrics.getStatus()).toEqual({ status: 'collecting', missingMetrics: ['FMP', 'page'] });
        expect(getTelemetry).not.toHaveBeenCalled();
    });

    it('returns diagnostics that cannot mutate coordinator state', () => {
        const metrics = createWebAppMetrics({
            requiredMetrics: ['FMP', 'page'],
            getTelemetry: () => createFakeTelemetry(),
        });

        const state = metrics.getStatus();

        state.missingMetrics.push('FMP');
        state.status = 'sent';

        expect(metrics.getStatus()).toEqual({ status: 'collecting', missingMetrics: ['FMP', 'page'] });
    });

    it('works without browser globals: construction and collection do not touch window', async () => {
        const telemetry = createFakeTelemetry();

        vi.stubGlobal('window', undefined);
        vi.stubGlobal('performance', undefined);

        try {
            const metrics = createWebAppMetrics({
                requiredMetrics: ['FMP'],
                getTelemetry: () => telemetry,
            });

            metrics.setMetrics({ FMP: 1 });
            await flushMicrotasks();

            expect(telemetry.send).toHaveBeenCalledTimes(1);
        } finally {
            vi.unstubAllGlobals();
        }
    });
});
