import { WebTelemetryBaseConfig } from './types';

export const defaultConfig: WebTelemetryBaseConfig = {
    endpoint: '',
    projectName: '',
    disabled: false,
    debug: false,
    delay: 2000,
    buffSize: 25,
    frameTime: true,
};
