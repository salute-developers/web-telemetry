import type { WebTelemetryBaseConfig } from './types.js';

export const defaultConfig: WebTelemetryBaseConfig = {
    endpoint: '',
    projectName: '',
    disabled: false,
    debug: false,
    delay: 2000,
    buffSize: 25,
    pauseSendingWhenPageInactive: false,
    maxQueueSize: 1000,
    queueOverflowStrategy: 'drop_oldest',
    frameTime: true,
};
