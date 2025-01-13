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

    protected sendHandler(events: WebTelemetryBaseEvent[]) {
        this.callTransport(events);
    }

    /**
     * Планирует отправку данных на сервер
     */
    protected async scheduleSend() {
        clearTimeout(this.timer);

        if (this.config.buffSize && this.events.length >= this.config.buffSize) {
            this.sendHandler(this.events);
            this.events = [];
        } else {
            this.timer = window.setTimeout(async () => {
                this.sendHandler(this.events);
                this.events = [];
            }, this.config.delay);
        }
    }

    protected async createEvent<M>(payload: P, meta?: M): Promise<WebTelemetryBaseEvent> {
        let evt: WebTelemetryBaseEvent = {
            sessionId: globalSessionId,
            ...this.payloadToJSON(payload),
        };

        let evtMetadata = meta || {};

        for (const addon of this.addons) {
            const [data, metadata] = await Promise.allSettled([addon.data(), addon.metadata()]);

            if (data.status === 'fulfilled') {
                evt = Object.assign({}, data.value, evt);
            }

            if (metadata.status === 'fulfilled') {
                evtMetadata = Object.assign({}, metadata.value, evtMetadata);
            }
        }

        evt.metadata = stringifyCircularObj(evtMetadata);

        return evt;
    }

    public async push<M>(payload: P, meta?: M): Promise<WebTelemetryBaseEvent> {
        if (this.config.disabled) {
            return { sessionId: 'disabled' };
        }

        const evt = await this.createEvent(payload, meta);

        this.events.push(evt);

        await this.scheduleSend();

        return evt;
    }

    /**
     * Вызывайте этот метод, если хотите отправить данные сразу.
     * Иначе вам нужен push, который батчит отправку данных.
     */
    public async pushListAndSend<M>(list: KVDataItem<P, M>[]) {
        const events = [];
        for (const { payload, meta } of list) {
            let evt;
            if (this.config.disabled) {
                evt = { sessionId: 'disabled' };
            } else {
                evt = await this.createEvent(payload, meta);
            }
            events.push(evt);
        }

        this.callTransport(events);
    }
}
