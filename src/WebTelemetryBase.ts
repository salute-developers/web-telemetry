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
import { v4 as uuidv4 } from 'uuid';
import { stringifyCircularObj } from './helpers';

/**
 * Базовая имплементация класса для работы с телеметрией
 */
export abstract class WebTelemetryBase<P, R> {
    /**
     * Список событий, которые будут отправлены на сервер
     */
    protected eventsMap: Map<String, Promise<WebTelemetryBaseEvent>> = new Map();

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

    protected sendHandler(events: WebTelemetryBaseEvent[]) {
        this.callTransport(events);
    }

    /**
     * Планирует отправку данных на сервер
     */
    protected scheduleSend() {
        clearTimeout(this.timer);

        if (this.config.buffSize && this.resolvedEvents.length >= this.config.buffSize) {
            this.sendHandler(this.resolvedEvents);
            this.resolvedEvents = [];
        } else {
            this.timer = window.setTimeout(async () => {
                this.sendHandler(this.resolvedEvents);
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
            addon.data().then((result) => {
                evt = Object.assign({}, result, evt);
            });

            addon.metadata().then((result) => {
                evtMetadata = Object.assign({}, result, evtMetadata);
            });
        }

        return new Promise<WebTelemetryBaseEvent>((resolve) => {
            setTimeout(() => {
                evt.metadata = stringifyCircularObj(evtMetadata);
                resolve(evt);
            }, 0);
        });
    }

    protected async eventQueue() {
        if (this.eventStarted && this.eventsMap.size === 0) return;
        this.eventStarted = true;

        const iterator = this.eventsMap.entries();

        for (const event of iterator) {
            event[1].then((data) => {
                this.resolvedEvents.push(data);
                this.scheduleSend();
                this.eventsMap.delete(event[0]);
            });
        }
    }

    public push<M>(payload: P, meta?: M): Promise<WebTelemetryBaseEvent> | WebTelemetryBaseEvent {
        if (this.config.disabled) {
            return { sessionId: 'disabled' };
        }

        const evt = this.createEvent(payload, meta);

        this.eventsMap.set(uuidv4(), evt);

        this.eventQueue();

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
