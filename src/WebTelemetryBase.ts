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
    protected resolvedEvents: Array<WebTelemetryBaseEvent> = [];

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
        this.callTransport(this.resolvedEvents);
    }

    /**
     * Планирует отправку данных на сервер
     */
    protected scheduleSend() {
        clearTimeout(this.timer);

        if (this.config.buffSize && this.resolvedEvents.length >= this.config.buffSize) {
            this.sendHandler();
            this.resolvedEvents = [];
        } else {
            this.timer = window.setTimeout(() => {
                this.sendHandler();
                this.resolvedEvents = [];
            }, this.config.delay);
        }
    }

    protected createEvent<M>(payload: P, meta?: M): Promise<WebTelemetryBaseEvent> {
        let evt: WebTelemetryBaseEvent = {
            sessionId: globalSessionId,
            ...this.payloadToJSON(payload),
        };

        let evtMetadata = meta || {};

        for (const addon of this.addons) {
            Promise.all([addon.data(), addon.metadata()]).then((results) => {
                const [dataResult, metadataResult] = results;

                evt = Object.assign({}, dataResult, evt);
                evtMetadata = Object.assign({}, metadataResult, evtMetadata);
            });
        }

        return new Promise<WebTelemetryBaseEvent>((resolve) => {
            setTimeout(() => {
                evt.metadata = stringifyCircularObj(evtMetadata);
                resolve(evt);
            }, 0);
        });
    }

    public push<M>(payload: P, meta?: M): Promise<WebTelemetryBaseEvent> | WebTelemetryBaseEvent {
        if (this.config.disabled) {
            return { sessionId: 'disabled' };
        }

        const evt = this.createEvent(payload, meta);

        evt.then((data) => {
            this.resolvedEvents.push(data);
            this.scheduleSend();
        });

        return evt;
    }

    /**
     * Вызывайте этот метод, если хотите отправить данные сразу.
     * Иначе вам нужен push, который батчит отправку данных.
     */
    public async pushListAndSend<M>(list: KVDataItem<P, M>[]) {
        const eventsPromises = [];

        for (const { payload, meta } of list) {
            let evt;
            if (this.config.disabled) {
                evt = { sessionId: 'disabled' };
            } else {
                evt = this.createEvent(payload, meta);
            }
            eventsPromises.push(evt);
        }

        const events = await Promise.all(eventsPromises);
        this.callTransport(events);
    }
}
