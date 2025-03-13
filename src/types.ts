import type { AssistantWindow } from '@salutejs/client';

export type WebTelemetryValue = string | number | boolean;

/**
 * Базовое событие, которое отправляется на сервер
 */
export interface WebTelemetryBaseEvent {
    sessionId: string;
    metadata?: string;
}

/**
 * Имплементация транспорта для отправки данных
 */
export interface WebTelemetryTransport {
    send(body: string): void;
}

export interface WebTelemetryAddon<T extends object = object, M extends object = object> {
    data(): Promise<T> | T;
    metadata(): Promise<M> | M;
}

export type KVDataItem<P = { key: string; value: any }, M = Record<string, any>> = {
    payload: P;
    meta?: M;
};
export interface WebTelemetryKVData {
    KVdata(): KVDataItem[];
}

export interface WebTelemetryBaseConfig {
    /**
     * Имя проекта
     */
    projectName: string;

    /**
     * Адрес сервера по-умолчанию.
     */
    endpoint: string;

    /**
     * Режим отладки. По-умолчанию включает `WebTelemetryTransportDebug`
     * в качестве основного транспорта
     */
    debug: boolean;

    /**
     * Таймаут на отправку данных. Если до истечения этого времени
     * явно или неявно был вызван метод `scheduleSend`, то отправка
     * откладывается на такой же промежуток времени
     */
    delay: number;

    /**
     * Размер буфера, в который добавляются новые события. При превышении
     * размера все запланированные и незапланированные события
     * будут отправлены принудительно
     */
    buffSize: number;

    /**
     * Отключает телеметрию и не вызывает транспорт
     */
    disabled: boolean;

    /**
     * Сбор и отправка frame time
     */
    frameTime: boolean;
}

type OptionalExcept<T, K extends keyof T> = Pick<T, K> & Partial<Omit<T, K>>;

export type WebTelemetryConfig = OptionalExcept<WebTelemetryBaseConfig, 'projectName'>;

type ResourcesBlackList = {
    /**
     * "Черный список" ресурсов, исключенных из мониторинга.
     * Экономим трафик пользователя и наши ресурсы.
     */
    resourcesBlackList?: RegExp[];
};

export type WebTelemetryResourcesConfig = WebTelemetryConfig & ResourcesBlackList;

export type WebTelemetryExtendedConfig = WebTelemetryConfig & ResourcesBlackList;

export type WindowWithAssistant = Window &
    AssistantWindow & {
        appInitialData: Record<string, any>;
        __ASSISTANT_CLIENT__?: {
            version: string;
            firstSmartAppDataMid?: string;
        };
    };
