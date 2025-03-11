import { describe, it, expect } from 'vitest';

import { validatePerformanceEntry, VIDEO_URLs } from './WebTelemetryResources.js';

describe('presets', () => {
    describe('WebTelemetryResources:validatePerformanceEntry', () => {
        const firstBlackList = [/api\.amplitude\.com/, /ingest\.sentry\.io/, /mc\.yandex\.ru/, VIDEO_URLs];
        const secondBlackList = [/img\.smotreshka\.tv/, /static\.okko\.tv/];

        const validator = validatePerformanceEntry(firstBlackList, secondBlackList);

        const desiredEntres = [
            { name: 'https://yandex.ru/' },
            { name: ' http://static.appercode.com/sbercode/quest/leader.html' },
            { name: ' http://static.appercode.com/my_ump4.jpg' },
        ] as PerformanceEntry[];

        const unadvisableEntres = [
            { name: 'https://ingest.sentry.io/' },
            { name: 'https://api.amplitude.com/' },
            {
                name: 'https://static.okko.tv/images/v2/17213101?size=784x456&quality=75',
            },
            {
                name: 'http://img.smotreshka.tv/image/aHR0cDovL2ltZy5iNjEyLnRpZ2h0dmlkZW8uY29tL2NoYW5uZWxzL2themFraF90dl9uZXcucG5n?width=784&height=456',
            },
            {
                name: 'https://mc.yandex.ru/webvisor/87707055?wmode=0&wv-part=24',
            },
            {
                name: 'https://example.com/my-video.mp4',
            },
        ] as PerformanceEntry[];

        const mixedEntres = [...desiredEntres, ...unadvisableEntres];

        it('passed all entries that does not match', () => {
            expect(desiredEntres.filter(validator)).toEqual(desiredEntres);
        });

        it('filtered out unadvisable entres', () => {
            expect(unadvisableEntres.filter(validator)).toEqual([]);
        });

        it('filtered out entrys if them is in one of the lists', () => {
            expect(mixedEntres.filter(validator)).toEqual(desiredEntres);
        });
    });
});
