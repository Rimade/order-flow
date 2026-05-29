# OrderFlow UI Kit (`@orderflow/ui`)

Собственная дизайн-система OrderFlow: подход как у **shadcn/ui** (компоненты в репозитории, полный контроль), но **бренд, токены и API — наши**.

**Связанные документы:**

- [microfrontends.md](./microfrontends.md) — где UI kit используется (все remotes + shell)
- [backend/docs/project-blueprint.md](../../backend/docs/project-blueprint.md) — общий контекст проекта

---

## 1. Философия

| shadcn/ui | OrderFlow UI Kit |
|-----------|------------------|
| Копируешь компоненты в свой проект | То же: код в `client/packages/ui`, не закрытый npm-пакет |
| Radix + Tailwind | **Radix UI Primitives** + **Tailwind 4** + наши токены |
| `cn()` + `class-variance-authority` | Тот же паттерн, префикс классов `of-` опционально |
| Обновления — merge вручную | Версии в monorepo, changelog в `packages/ui` |

**Почему свой kit, а не «просто shadcn»:**

- единый визуальный язык OrderFlow на всех микрофронтах;
- нет зависимости от внешнего CLI и чужих пресетов;
- на собеседовании можно показать **дизайн-систему в monorepo** — это сильнее, чем «поставил shadcn»;
- компоненты заточены под домен: `OrderStatusBadge`, `EmptyOrders`, `ApiErrorAlert`.

---

## 2. Расположение в репозитории

```text
client/packages/ui/
  src/
    components/          # Button, Input, Card, ...
    patterns/            # составные блоки: OrderStatusBadge, PageHeader
    hooks/               # useMediaQuery, useToast (если нужно)
    lib/
      cn.ts              # clsx + tailwind-merge
    styles/
      globals.css        # @import tailwind; CSS variables
      tokens.css         # цвета, радиусы, шрифты
  package.json           # name: @orderflow/ui
  tsconfig.json
  tailwind.config.ts     # или @theme в CSS (Tailwind 4)
```

**Потребители:** `apps/shell`, `apps/mfe-auth`, `apps/mfe-orders`, …

```tsx
import { Button, Card, OrderStatusBadge } from '@orderflow/ui';
import '@orderflow/ui/styles.css';
```

---

## 3. Технический стек UI kit

| Инструмент | Роль |
|------------|------|
| **React 19** | компоненты |
| **TypeScript** | strict props |
| **Tailwind CSS 4** | утилиты + `@theme` |
| **Radix UI** | a11y: Dialog, Dropdown, Tabs, Toast, Label |
| **class-variance-authority (cva)** | варианты `variant`, `size` |
| **clsx** + **tailwind-merge** | функция `cn()` |
| **lucide-react** | иконки (единый набор) |
| **Vitest** + **Testing Library** | тесты критичных компонентов |

**Не включаем на старте:** Framer Motion, MUI, Ant Design, готовый shadcn CLI.

---

## 4. Дизайн-токены (CSS variables)

Токены — **единственный источник правды** для цветов и отступов. Компоненты не хардкодят `#3b82f6`.

### 4.1. Пример `tokens.css` (концепт)

```css
:root {
  /* Brand */
  --of-color-primary: 222 89% 56%;
  --of-color-primary-foreground: 0 0% 100%;

  /* Surfaces */
  --of-color-background: 220 20% 98%;
  --of-color-foreground: 222 47% 11%;
  --of-color-card: 0 0% 100%;
  --of-color-muted: 220 14% 96%;
  --of-color-muted-foreground: 220 9% 46%;

  /* Semantic */
  --of-color-success: 142 76% 36%;
  --of-color-warning: 38 92% 50%;
  --of-color-danger: 0 84% 60%;
  --of-color-info: 199 89% 48%;

  /* Border & focus */
  --of-color-border: 220 13% 91%;
  --of-color-ring: 222 89% 56%;

  /* Radius */
  --of-radius-sm: 0.375rem;
  --of-radius-md: 0.5rem;
  --of-radius-lg: 0.75rem;

  /* Typography */
  --of-font-sans: 'Inter', system-ui, sans-serif;
}

.dark {
  --of-color-background: 222 47% 7%;
  --of-color-foreground: 210 40% 98%;
  --of-color-card: 222 47% 11%;
  /* ... */
}
```

В Tailwind 4 маппинг через `@theme`:

```css
@theme {
  --color-primary: hsl(var(--of-color-primary));
  --color-background: hsl(var(--of-color-background));
  /* ... */
}
```

### 4.2. Тема

- **Светлая** — по умолчанию.
- **Тёмная** — класс `.dark` на `<html>` (переключатель в shell header, фаза 1.1).
- Токены меняются только в `tokens.css`, не в каждом компоненте.

---

## 5. Паттерн компонента (как shadcn, но наш)

### 5.1. Структура файла

```text
components/
  button/
    button.tsx       # реализация + cva
    button.types.ts  # опционально: отдельные типы
    index.ts         # re-export
```

### 5.2. Пример API — `Button`

```tsx
// variants: default | secondary | outline | ghost | destructive
// sizes: sm | md | lg
<Button variant="default" size="md">Создать заказ</Button>
<Button variant="destructive" loading>Удалить</Button>
```

Правила:

- `forwardRef` для инпутов и кнопок;
- `disabled` и `loading` не ломают a11y (`aria-busy`);
- все стили через `cn(buttonVariants({ variant, size }), className)`.

### 5.3. Функция `cn()`

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 6. Каталог компонентов по фазам

### Фаза 1 — MVP (блокирует mfe-auth + mfe-orders)

| Компонент | Назначение |
|-----------|------------|
| **Button** | действия, submit |
| **Input** | email, password, quantity |
| **Label** | доступность форм |
| **Card** | блоки login, заказ |
| **Alert** | ошибки API |
| **Badge** | статусы |
| **Spinner** | loading |
| **Separator** | layout |
| **Skeleton** | загрузка списка заказов |

### Паттерны фазы 1 (domain)

| Паттерн | Назначение |
|---------|------------|
| **OrderStatusBadge** | маппинг `PENDING` → `CONFIRMED` на variant Badge |
| **PageHeader** | title + description + actions |
| **EmptyState** | «Заказов пока нет» |
| **FormField** | Label + Input + error message |

### Фаза 2

| Компонент | Назначение |
|-----------|------------|
| **Table** | список заказов / каталог |
| **Dialog** | подтверждение |
| **Select** | фильтры |
| **Tabs** | деталь заказа |
| **Toast** | успех «Заказ создан» |
| **DropdownMenu** | меню пользователя в shell |

### Фаза 3

| Компонент | Назначение |
|-----------|------------|
| **DataTable** | сортировка, пагинация |
| **Sheet** | мобильные фильтры |
| **Breadcrumb** | каталог |
| **Tooltip** | подсказки |

---

## 7. OrderStatusBadge (доменный контракт)

Единый маппинг статусов backend → UI (используют **все** remotes):

| `status` | Label (RU) | Variant |
|----------|------------|---------|
| `PENDING` | Ожидает резерв | `warning` |
| `PAYMENT_PENDING` | Оплата | `info` |
| `CONFIRMED` | Подтверждён | `success` |
| `CANCELLED` | Отменён | `neutral` |
| `FAILED` | Ошибка | `danger` |

Источник правды — один файл `patterns/order-status-badge.tsx`, не копировать цвета в `mfe-orders`.

---

## 8. Доступность (a11y)

- Radix для фокуса, escape, aria;
- контраст текста ≥ WCAG AA на primary/background;
- видимый `:focus-visible` через `--of-color-ring`;
- формы: связка `Label` + `htmlFor` + `aria-invalid` при ошибке Zod.

---

## 9. Документация компонентов

На фазе 1 достаточно **Storybook** или **Ladle** в `packages/ui`:

```bash
pnpm --filter @orderflow/ui storybook
```

Каждый PR с новым компонентом — минимум одна story: default + disabled/error.

Альтернатива без Storybook: страница `/dev/ui` только в shell (быстрее на старте).

---

## 10. Правила для микрофронтов

| Правило | Почему |
|---------|--------|
| Импорт только из `@orderflow/ui` | один визуальный язык |
| Не копировать `button.tsx` в `mfe-orders` | drift стилей |
| Кастомизация через `className` и variants | гибкость без форка |
| Доменные блоки — в `patterns/`, не в mfe | переиспользование |
| Один `globals.css` / `styles.css` в entry shell | токены инициализированы один раз |

---

## 11. CLI «добавить компонент» (опционально, фаза 2)

Свой лёгкий скрипт, не shadcn CLI:

```bash
pnpm ui:add badge
# копирует шаблон из client/packages/ui/_templates/badge → components/badge
```

Шаблоны храним в репозитории; имя пакета в импортах — `@orderflow/ui`.

---

## 12. Версионирование и breaking changes

- Пакет `@orderflow/ui` — **0.x** до стабилизации API;
- breaking change → bump minor в monorepo + запись в `client/packages/ui/CHANGELOG.md`;
- remotes обновляются одним PR в monorepo (плюс Turborepo).

---

## 13. Чего избегать

- Сырой CSS в каждом MFE «потому что быстрее»;
- Разные иконки (Heroicons + Lucide + emoji);
- Inline-стили для отступов вместо токенов;
- Копирование Tailwind config в каждый app — только extend из `@orderflow/ui/tailwind-preset` (добавим при коде).

---

## 14. Связь с брендом OrderFlow

Рабочее направление (можно уточнить перед кодом):

- **Характер:** надёжный B2C/backend-driven commerce, не «игрушечный»;
- **Акцент:** синий primary, нейтральные серые поверхности;
- **Плотность:** comfortable (не compact admin), читаемо для обучения;
- **Шрифт:** Inter (Google Fonts или self-host).

Логотип и favicon — отдельная мини-задача в shell.

---

## 15. Компоненты (актуально)

Реализованы: `Button`, `Input`, `Label`, `Card`, `Badge`, `Alert`, `Spinner`, `Table`, `Dialog`, `Select`, `OrderStatusBadge`.

`Dialog` + `Select` используются в `mfe-catalog` (оформление с выбором количества).

## 16. Следующий шаг

- Vitest для UI, Storybook (опционально).
- Логотип и favicon в shell.

Вопросы и изменения API компонентов — через PR + короткая запись в CHANGELOG пакета `ui`.
