# Полный справочник классов

## Layout

| Класс | Назначение |
|---|---|
| `.ds-container` | Контейнер 1120px с боковыми полями |
| `.ds-container--narrow` | 720px — для текстовых страниц |
| `.ds-container--wide` | 1400px — для дашбордов |
| `.ds-section` | Вертикальные отступы секции (адаптивные) |
| `.ds-section--tight` | Уменьшенные отступы |
| `.ds-section--sunken` | Утопленный фон — чередуй с обычными секциями |
| `.ds-stack` | Колонка с gap 16px |
| `.ds-stack--sm` / `--lg` | gap 8px / 32px |
| `.ds-row` | Ряд по центру с gap 12px, переносится |
| `.ds-row--between` / `--center` / `--nowrap` | Выравнивание |
| `.ds-grid` | Сетка auto-fit от 260px |
| `.ds-grid--2` | От 340px — крупные карточки |
| `.ds-grid--4` | От 180px — плитки |
| `.ds-split` | Две колонки от 400px — hero «текст + медиа» |
| `.ds-divider` | Горизонтальная линия |

## Типографика

`.ds-display` (44→80px) · `.ds-h1` (32→48) · `.ds-h2` (24→34) · `.ds-h3` (21→26)
`.ds-h4` (19) · `.ds-lead` · `.ds-body` (17) · `.ds-small` (15) · `.ds-caption` (13)
`.ds-section-label` — мелкий заголовок группы · `.ds-mono` · `.ds-prose` — блок статьи

## Кнопки

Базовый `.ds-btn` плюс вариант:
`--primary` заливка акцентом · `--tinted` полупрозрачный акцент · `--gray` серая
`--outline` обводка · `--plain` без фона · `--danger` красная

Размеры: `--sm` (34px) · по умолчанию (44px) · `--lg` (54px)
Модификаторы: `--block` на всю ширину · `--icon` квадратная под иконку

Сегменты: `.ds-segmented` c `<button role="tab" aria-selected="true">`

## Формы

`.ds-field` обёртка · `.ds-label` · `.ds-help` · `.ds-error`
`.ds-input` · `.ds-textarea` · `.ds-select` · `.ds-search` (обёртка с иконкой)

Переключатель:
```html
<label class="ds-switch"><input type="checkbox"><span></span></label>
```

Чекбокс и радио:
```html
<label class="ds-check"><input type="checkbox"> Текст</label>
```

Ошибка поля — атрибут `aria-invalid="true"`, не класс.

## Карточки и плитки

`.ds-card` · `--flat` (обводка вместо тени) · `--sunken` · `--link` (поднимается на hover)
`.ds-card__media` — изображение в край карточки
`.ds-hero-card` — крупная градиентная карточка со свечением

`.ds-tile` (52px) · `--sm` (38px) · `--lg` (64px)
Градиенты: `.ds-g-blue` `purple` `pink` `orange` `green` `teal` `gold` `slate`

## Списки

```html
<div class="ds-list">
  <a class="ds-list__item" href="#">
    <span class="ds-tile ds-tile--sm ds-g-blue">…</span>
    <span class="ds-list__body">
      <span class="ds-list__title">Заголовок</span>
      <span class="ds-list__sub">Подпись</span>
    </span>
    <span class="ds-list__value">Значение</span>
    <svg class="ds-list__chevron">…</svg>
  </a>
</div>
```

Отступ разделителя считается автоматически от размера плитки через `:has()`.
Для старых браузеров добавь `.ds-list--icons` на контейнер.

## Навигация

`.ds-header` — липкая стеклянная шапка. Тень включается атрибутом
`data-stuck="true"` — ставь через IntersectionObserver, не через слушатель scroll:

```js
const s = document.createElement('div');
document.body.prepend(s);
new IntersectionObserver(([e]) =>
  header.dataset.stuck = String(!e.isIntersecting)
).observe(s);
```

`.ds-header__inner` · `.ds-brand` · `.ds-nav` · `.ds-breadcrumb`

## Индикаторы

`.ds-badge` · `--accent` `--success` `--warning` `--danger`
`.ds-dot` — точка статуса · `.ds-avatar` · `--sm` `--lg`

## Таблицы

```html
<div class="ds-table-wrap">
  <table class="ds-table">
    <thead><tr><th>Колонка</th><th class="num">Сумма</th></tr></thead>
    <tbody><tr><td>Строка</td><td class="num">2 400 €</td></tr></tbody>
  </table>
</div>
```

`.num` выравнивает по правому краю и включает табличные цифры.

## Оверлеи

`.ds-scrim` · `.ds-modal` · `.ds-sheet` (+ `.ds-sheet__grabber`) · `.ds-toast`

Открытие — атрибут `data-open="true"`. Обязательно реализуй:
закрытие по Escape, закрытие по клику на scrim, ловушку фокуса,
возврат фокуса на элемент-инициатор, `overflow:hidden` на body.

## Утилиты

`.ds-muted` `.ds-faint` `.ds-accent` — цвет текста
`.ds-center` `.ds-right` `.ds-balance` `.ds-nowrap` `.ds-tabular`
`.ds-truncate` `.ds-clamp-2` `.ds-clamp-3`
`.ds-full` `.ds-fit` `.ds-grow`
`.ds-hide` `.ds-hide@sm` `.ds-only@sm`
`.ds-sr` — только для скринридера
`.ds-glass` — стеклянная подложка
`.ds-defer` — content-visibility для тяжёлых секций
`.ds-safe-top` `.ds-safe-bottom` — безопасные зоны мобильных

## Токены

Цвета: `--ds-blue green indigo orange pink purple red teal yellow mint brown cyan`
Семантика: `--ds-accent --ds-accent-hover --ds-accent-soft --ds-success --ds-warning --ds-danger`
Текст: `--ds-text --ds-text-2 --ds-text-3 --ds-text-on-accent`
Поверхности: `--ds-bg --ds-bg-sunken --ds-surface --ds-surface-2 --ds-fill --ds-fill-strong --ds-border --ds-border-strong --ds-glass --ds-scrim`
Отступы: `--ds-1 2 3 4 5 6 8 10 12 16 20 24 32` (шаг 4px)
Скругления: `--ds-r-xs sm md lg xl 2xl full`
Тени: `--ds-sh-xs sm md lg xl knob`
Движение: `--ds-ease` (пружина iOS) `--ds-ease-out --ds-ease-in-out --ds-dur-fast --ds-dur --ds-dur-slow`
