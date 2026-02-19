import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { WebTelemetryKV } from '../presets/WebTelemetryKV.js';
import type { WebTelemetryTransport } from '../types.js';

import { KVDataMemory } from './KVDataMemory.js';

function createFakeTransport() {
    const calls: string[] = [];

    const transport: WebTelemetryTransport = {
        send(body: string) {
            calls.push(body);
        },
    };

    return { transport, calls };
}

function createKV(transport: WebTelemetryTransport) {
    return new WebTelemetryKV({ projectName: 'test' }, [transport]);
}

describe('KVDataMemory', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();

        delete (performance as any).memory;
        delete (performance as any).measureUserAgentSpecificMemory;
        (globalThis as any).crossOriginIsolated = false;
    });

    it('should measure via performance.memory and send data', async () => {
        (performance as any).memory = { usedJSHeapSize: 50_000_000 };

        const { transport, calls } = createFakeTransport();
        const kv = createKV(transport);
        const memory = new KVDataMemory(kv, 1);

        await memory.startMonitoring();

        expect(calls.length).toBe(1);
        const data = JSON.parse(calls[0]);
        const item = data.find((x: any) => x.key === 'MemoryUsedBytes');
        expect(item.valueNum).toBe(50_000_000);

        memory.endMonitoring();
    });

    it('should measure via measureUserAgentSpecificMemory when cross-origin isolated', async () => {
        (globalThis as any).crossOriginIsolated = true;
        (performance as any).measureUserAgentSpecificMemory = vi.fn().mockResolvedValue({ bytes: 80_000_000 }) as any;

        const { transport, calls } = createFakeTransport();
        const kv = createKV(transport);
        const memory = new KVDataMemory(kv, 1);

        await memory.startMonitoring();

        expect(calls.length).toBe(1);
        const data = JSON.parse(calls[0]);
        const item = data.find((x: any) => x.key === 'MemoryUsedBytes');
        expect(item.valueNum).toBe(80_000_000);
        expect((performance as any).measureUserAgentSpecificMemory).toHaveBeenCalled();

        memory.endMonitoring();
    });

    it('should fallback to performance.memory when measureUserAgentSpecificMemory throws', async () => {
        (globalThis as any).crossOriginIsolated = true;
        (performance as any).measureUserAgentSpecificMemory = vi
            .fn()
            .mockRejectedValue(new DOMException('not allowed', 'SecurityError'));
        (performance as any).memory = { usedJSHeapSize: 30_000_000 };

        const { transport, calls } = createFakeTransport();
        const kv = createKV(transport);
        const memory = new KVDataMemory(kv, 1);

        await memory.startMonitoring();

        expect(calls.length).toBe(1);
        const data = JSON.parse(calls[0]);
        const item = data.find((x: any) => x.key === 'MemoryUsedBytes');
        expect(item.valueNum).toBe(30_000_000);

        memory.endMonitoring();
    });

    it('should not send data when no memory API is available', async () => {
        const { transport, calls } = createFakeTransport();
        const kv = createKV(transport);
        const memory = new KVDataMemory(kv, 1);

        await memory.startMonitoring();

        expect(calls.length).toBe(0);

        memory.endMonitoring();
    });

    it('should send measurements periodically', async () => {
        (performance as any).memory = { usedJSHeapSize: 10_000_000 };

        const { transport, calls } = createFakeTransport();
        const kv = createKV(transport);
        const memory = new KVDataMemory(kv, 1);

        await memory.startMonitoring();
        expect(calls.length).toBe(1);

        // Advance to first interval
        await vi.advanceTimersByTimeAsync(60_000);
        expect(calls.length).toBe(2);

        // Advance to second interval
        await vi.advanceTimersByTimeAsync(60_000);
        expect(calls.length).toBe(3);

        memory.endMonitoring();
    });

    it('should stop sending after endMonitoring is called', async () => {
        (performance as any).memory = { usedJSHeapSize: 10_000_000 };

        const { transport, calls } = createFakeTransport();
        const kv = createKV(transport);
        const memory = new KVDataMemory(kv, 1);

        await memory.startMonitoring();
        expect(calls.length).toBe(1);

        memory.endMonitoring();

        await vi.advanceTimersByTimeAsync(60_000);
        expect(calls.length).toBe(1);

        await vi.advanceTimersByTimeAsync(60_000);
        expect(calls.length).toBe(1);
    });

    it('should return empty array from KVdata before any measurement', () => {
        const { transport } = createFakeTransport();
        const kv = createKV(transport);
        const memory = new KVDataMemory(kv, 1);

        expect(memory.KVdata()).toEqual([]);
    });

    it('should use default interval of 5 minutes', async () => {
        (performance as any).memory = { usedJSHeapSize: 10_000_000 };

        const { transport, calls } = createFakeTransport();
        const kv = createKV(transport);
        const memory = new KVDataMemory(kv);

        await memory.startMonitoring();
        expect(calls.length).toBe(1);

        // 4 minutes — no new measurement yet
        await vi.advanceTimersByTimeAsync(4 * 60_000);
        expect(calls.length).toBe(1);

        // 5 minutes — second measurement
        await vi.advanceTimersByTimeAsync(60_000);
        expect(calls.length).toBe(2);

        memory.endMonitoring();
    });

    it('should reflect updated memory values in subsequent measurements', async () => {
        let heapSize = 10_000_000;
        Object.defineProperty(performance, 'memory', {
            get: () => ({ usedJSHeapSize: heapSize }),
            configurable: true,
        });

        const { transport, calls } = createFakeTransport();
        const kv = createKV(transport);
        const memory = new KVDataMemory(kv, 1);

        await memory.startMonitoring();

        const first = JSON.parse(calls[0]).find((x: any) => x.key === 'MemoryUsedBytes');
        expect(first.valueNum).toBe(10_000_000);

        heapSize = 25_000_000;
        await vi.advanceTimersByTimeAsync(60_000);

        const second = JSON.parse(calls[1]).find((x: any) => x.key === 'MemoryUsedBytes');
        expect(second.valueNum).toBe(25_000_000);

        memory.endMonitoring();
    });
});
