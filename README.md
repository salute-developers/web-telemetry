# Web telemetry 🔮

> Пакет для сбора и отправки метрик скорости работы веб приложений

## Установка

`npm i -s @salutejs/web-telemetry`

## Подключение

WIP

## Координация метрик webApp события (`createWebAppMetrics`)

Поля webApp события часто появляются в разных частях приложения (рендер в корневом компоненте, FMP в компоненте контента, версия из CI). Независимые вызовы `webApp.send()` приводят к отправке неполного события: повторный `send()` игнорируется.

`createWebAppMetrics` решает эту проблему: координатор накапливает метрики и отправляет **ровно один** `webApp.send()` после того, как все обязательные поля собраны.

```typescript
// utils/webAppMetrics.ts
import { createWebAppMetrics } from '@salutejs/web-telemetry/lib/createWebAppMetrics';

let reactRenderStart: number;
if (typeof window !== 'undefined') {
    reactRenderStart = Math.round(performance.now());
}

// Один синглтон на одно webApp событие — экспортируйте и используйте его во всём приложении
export const webAppMetrics = createWebAppMetrics({
    requiredMetrics: ['reactRenderStart', 'reactRenderEnd', 'FMP', 'page'],
    getTelemetry: () => import('./webTelemetry').then(({ getTelemetryInstance }) => getTelemetryInstance().webApp),
    // onError: (error) => reportToSentry(error), // опционально
});

// корневой компонент — эффект рендера
useEffect(() => {
    webAppMetrics.setMetrics({
        reactRenderStart,
        reactRenderEnd: Math.round(performance.now()),
        appVersion: process.env.NEXT_PUBLIC_RELEASE, // дополнительные поля попадут в тот же event
    });
}, []);

// хук готовности контента (FMP)
useEffect(() => {
    if (isLoaded) {
        webAppMetrics.setMetrics({ FMP: Math.round(performance.now()), page });
    }
}, [page, isLoaded]);
```

**Как это работает:**

- Жизненный цикл: `collecting → sending → sent` (или `failed`).
- `setMetrics()` принимает поля частями; `undefined` игнорируется, `0`/`false`/`''` — валидные значения.
- Пока идёт сбор, позднее значение побеждает. Когда все обязательные поля собраны — снапшот фиксируется синхронно, дальнейшие вызовы игнорируются.
- Загрузка телеметрии (`getTelemetry`) вызывается один раз — уже после сбора всех полей. Поддерживает синхронный возврат и `Promise`.
- `sent` означает, что `webApp.send()` вызван без ошибки, а не что данные дошли до сервера.
- Ошибка загрузки/записи/отправки — терминальная: без ретраев, тихо, либо через опциональный `onError`.
- Диагностика: `webAppMetrics.getStatus()` возвращает `{ status, missingMetrics }` — какие обязательные поля ещё не пришли.

**Ответственность потребителя:**

- Один координатор — одно webApp событие. Не смешивайте прямые вызовы `webApp.send()` с координатором.
- Обязательные имена метрик определяете вы — FMP и React метрики не зашиты в пакет.
- Создание координатора безопасно в SSR: не обращается к `window`/`performance` и не вызывает загрузчик.
