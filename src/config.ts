import { WebTelemetryBaseConfig } from './types';
import { version } from '../package.json'

export const defaultConfig: WebTelemetryBaseConfig = {
    endpoint: '',
    projectName: '',
    disabled: false,
    debug: false,
    delay: 2000,
    buffSize: 25,
    frameTime: true,
    telemetryVersion: version
};
