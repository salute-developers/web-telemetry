# KVDataMemory

Периодический мониторинг потребления памяти страницей.

## Как работает

- При старте делает первый замер и отправляет результат.
- Далее повторяет замер через равные интервалы (по умолчанию 5 минут).
- Каждый замер отправляется как KV-событие с ключом `MemoryUsedBytes` (значение в байтах).
- На сервере данные привязаны к `sessionId` и имеют timestamp — этого достаточно для построения графика потребления памяти по времени и обнаружения утечек.

## Источник данных

Класс автоматически выбирает доступный браузерный API:

1. `performance.measureUserAgentSpecificMemory()` — стандартный API, измеряет полное потребление (JS + DOM + iframe). Требует cross-origin isolation. Поддержка: Chromium 89+.
2. `performance.memory.usedJSHeapSize` — legacy API (только JS heap). Не требует специальных заголовков. Поддержка: только Chromium.

Если ни один API недоступен, данные не отправляются.

## Использование

```typescript
import { WebTelemetryKV } from '@salutejs/web-telemetry/lib/presets/WebTelemetryKV';
import { KVDataMemory } from '@salutejs/web-telemetry/lib/extra/KVDataMemory';

const kv = new WebTelemetryKV({
    projectName: 'my-app-memory',
    endpoint: 'https://telemetry.example.com',
});

// Замер каждые 5 минут (по умолчанию)
const memory = new KVDataMemory(kv);
await memory.startMonitoring();

// Или с кастомным интервалом — каждые 2 минуты
const memory = new KVDataMemory(kv, 2);
await memory.startMonitoring();

// Остановка мониторинга
memory.endMonitoring();
```

## Отправляемые данные

| Ключ              | Тип      | Описание                    |
| ----------------- | -------- | --------------------------- |
| `MemoryUsedBytes` | `number` | Потребление памяти в байтах |
