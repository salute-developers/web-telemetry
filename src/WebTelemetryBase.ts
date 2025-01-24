import { defaultConfig } from './config';
import {
    WebTelemetryAddon,
    WebTelemetryBaseConfig,
    WebTelemetryConfig,
    WebTelemetryBaseEvent,
    WebTelemetryTransport,
    KVDataItem,
} from './types';
import { WebTelemetryTransportDebug, WebTelemetryTransportDefault } from './WebTelemetryTransport';
import { globalSessionId } from './constants';
import { stringifyCircularObj } from './helpers';

/**
 * Базовая имплементация класса для работы с телеметрией
 */
export abstract class WebTelemetryBase<P, R> {
    /**
     * Список событий, которые будут отправлены на сервер
     */
    protected events: Array<WebTelemetryBaseEvent> = [];

    protected eventStarted: boolean = false;

    protected config: WebTelemetryBaseConfig;

    protected transports: Array<WebTelemetryTransport>;

    protected addons: Array<WebTelemetryAddon> = [];

    private timer: number | undefined;
    /**
     *
     * @param config конфигурация
     * @param addons список дополнений
     * @param transports Список имплементаций WebTelemetryTransport.
     * Для каждого транспорта из списка будет вызыван метод `send`.
     * С помощью данного списка можно отправлять данные на несколько серверов
     */
    constructor(
        config: WebTelemetryConfig,
        addons: Array<WebTelemetryAddon> = [],
        transports?: Array<WebTelemetryTransport>,
    ) {
        this.config = {
            ...defaultConfig,
            ...config,
        };

        this.addons = addons;

        if (transports) {
            this.transports = transports;
        } else {
            this.transports = this.config.debug
                ? [new WebTelemetryTransportDebug()]
                : [new WebTelemetryTransportDefault(`${this.config.endpoint}/${this.config.projectName}`)];
        }
    }

    /**
     * Метод, который преобразует входной формат данных в формат данных
     * отдельно взятой таблицы.
     */
    protected abstract payloadToJSON(payload: P): R;

    protected callTransport<T>(data: T) {
        if (this.config.disabled) {
            return;
        }

        const body = JSON.stringify(data);
        this.transports.forEach((t) => {
            t.send(body);
        });
    }

    protected sendHandler() {
        this.callTransport(this.events);
    }

    /**
     * Планирует отправку данных на сервер
     */
    protected scheduleSend() {
        clearTimeout(this.timer);

        if (this.config.buffSize && this.events.length >= this.config.buffSize) {
            this.sendHandler();
            this.events = [];
        } else {
            this.timer = window.setTimeout(() => {
                this.sendHandler();
                this.events = [];
            }, this.config.delay);
        }
    }

    protected createEvent<M>(payload: P, meta?: M): Promise<WebTelemetryBaseEvent> {
        let evt: WebTelemetryBaseEvent = {
            sessionId: globalSessionId,
            ...this.payloadToJSON(payload),
        };

        let evtMetadata = meta || {};

        const addonPromises = this.addons.map((addon) => Promise.all([addon.data(), addon.metadata()]));

        return Promise.all(addonPromises).then((results) => {
            const [finalEvt, finalMetadata] = results.reduce(
                ([currentEvt, currentMetadata], [dataResult, metadataResult]) => {
                    return [
                        {
                            ...dataResult,
                            ...currentEvt,
                        },
                        {
                            ...metadataResult,
                            ...currentMetadata,
                        },
                    ];
                },
                [{}, evtMetadata],
            );

            return {
                ...{ ...evt, ...finalEvt },
                metadata: stringifyCircularObj(finalMetadata),
            };
        });
    }

    public push<M>(payload: P, meta?: M): Promise<WebTelemetryBaseEvent> | WebTelemetryBaseEvent {
        if (this.config.disabled) {
            return { sessionId: 'disabled' };
        }

        const evt = this.createEvent(payload, meta);

        evt.then((data) => {
            this.events.push(data);
            this.scheduleSend();
        });

        return evt;
    }

    /**
     * Вызывайте этот метод, если хотите отправить данные сразу.
     * Иначе вам нужен push, который батчит отправку данных.
     */
    public pushListAndSend<M>(list: KVDataItem<P, M>[]) {
        const events = [];
        for (const { payload, meta } of list) {
            let evt;
            if (this.config.disabled) {
                evt = { sessionId: 'disabled' };
            } else {
                evt = this.createEvent(payload, meta);
            }
            events.push(evt);
        }

        this.callTransport(events);
    }
}
