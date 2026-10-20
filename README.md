# Web telemetry 🔮

> Пакет для сбора и отправки метрик скорости работы веб-приложений

## Установка

```bash
npm install @salutejs/web-telemetry
```

## Подключение

Для веб-приложения используйте `WebTelemetryMonitoringWeb`. Укажите `projectName` и адрес своего сервера приёма метрик: у открытого пакета `endpoint` по умолчанию пустой.

```typescript
import { WebTelemetryMonitoringWeb } from '@salutejs/web-telemetry/lib/presets/WebTelemetryMonitoringWeb';

const telemetry = WebTelemetryMonitoringWeb.Instance({
    projectName: 'my-app',
    endpoint: 'https://metrics.example.com',
    debug: false,
});

telemetry.startMonitoring();
telemetry.webApp.setMetric('appVersion', '1.0.0');
telemetry.webApp.setMetadata('deployment', 'production');

// Вызовите после установки обязательных метрик основного события.
telemetry.webApp.send();

// Произвольные метрики отправляются отдельно от основного события.
telemetry.KV.push({ key: 'customMetric', value: 42 });
```

`Instance()` возвращает один экземпляр пресета. `startMonitoring()` запускает сбор ресурсов, длительных задач и времени кадров. Основное событие приложения отправляет `webApp.send()`; вызов `startMonitoring()` его не отправляет. Для Canvas-приложения используйте `WebTelemetryMonitoringCanvas` и `telemetry.canvasApp`:

```typescript
import { WebTelemetryMonitoringCanvas } from '@salutejs/web-telemetry/lib/presets/WebTelemetryMonitoringCanvas';

const telemetry = WebTelemetryMonitoringCanvas.Instance({
    projectName: 'my-canvas-app',
    endpoint: 'https://metrics.example.com',
});
telemetry.startMonitoring();
telemetry.canvasApp.setMetric('appVersion', '1.0.0');
telemetry.canvasApp.send();
```

При стандартном транспорте основной поток отправляется на `${endpoint}/${projectName}`, произвольные метрики — на `${endpoint}/${projectName}-metrics`, ресурсы — на `${endpoint}/${projectName}-resources`. Создание таблиц и схема хранения относятся к серверу приёма, а не к этому пакету.

## Как работает `send()`

Для `webApp` и `canvasApp` вызов `send()` **однократный**. Первый вызов запускает таймер на `delay` миллисекунд: по умолчанию **2000 мс**. Повторные вызовы `send()` ничего не меняют и не перезапускают таймер.

До фактической отправки можно вызвать `setMetric()` или `setMetadata()` ещё раз: актуальные значения попадут в событие. Если обязательная метрика добавлена после отправки, повторный `send()` её не доставит. Поэтому устанавливайте обязательные метрики **до первого вызова** `send()`; задержку не следует использовать как гарантию, что асинхронная метрика успеет прийти. Значение `delay` можно изменить в конфигурации пресета.

`KV.push()` и сбор ресурсов работают иначе: они добавляют события в отдельные очереди. Для них каждый новый `push()` планирует отправку через `delay` заново, а достижение `buffSize` отправляет очередь сразу. По умолчанию `buffSize` равен **25**; он не заставляет `webApp.send()` отправлять основное событие раньше.

## Измерение при динамическом импорте

Загружать пакет через `import()` можно после начала работы приложения, чтобы телеметрия не увеличивала начальный бандл. Фиксируйте время в момент события **до** загрузки пакета, а затем передавайте сохранённое значение в `setMetric()`:

```typescript
async function onMeaningfulContentReady() {
    const fmp = Math.round(performance.now());

    const { WebTelemetryMonitoringWeb } = await import('@salutejs/web-telemetry/lib/presets/WebTelemetryMonitoringWeb');
    const telemetry = WebTelemetryMonitoringWeb.Instance({
        projectName: 'my-app',
        endpoint: 'https://metrics.example.com',
    });

    telemetry.webApp.setMetric('FMP', fmp);
    telemetry.webApp.send();
}
```

Так же сохраняйте `reactRenderStart` и `reactRenderEnd` в соответствующие моменты рендера. Время выполнения `import()` не должно попадать в измеряемый интервал. Если основной `send()` уже был вызван раньше, эта метрика попадёт в событие только до срабатывания его таймера.
