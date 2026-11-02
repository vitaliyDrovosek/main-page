# Startpage / Personal Dashboard

Персональная стартовая страница (браузерный дашборд), написанная на чистом JavaScript (ES6 Modules) без использования фреймворков и сборщиков.

## О проекте

Проект представляет собой кастомизируемую стартовую страницу с виджетами, играми и элементами оформления. Всё хранится в `localStorage` и легко переносится через экспорт/импорт конфигурации.

### Основной стек:
- HTML5 / CSS3 (CSS-переменные для тем, Flexbox/Grid, Backdrop-filter для стекла)
- Vanilla JS (ES6 Modules, классы)
- Canvas API (для интерактивных частиц)
- Web Audio API (для звуков таймера и достижений)
- LocalStorage (для сохранения состояния и конфига)

### Структура проекта:
- `index.html` — основной HTML-каркас, разметка виджетов, модальных окон и дропдаун-меню.
- `styles/` — стили (разбиты по компонентам: база, часы, группы, заметки и т.д.). Подключаются в `index.html` отдельными `<link>` для параллельной загрузки.
- `app.js` — точка входа, инициализация всех модулей и управление состоянием.
- `modules/` — логика (каждый виджет или фича вынесены в отдельный класс).

---

## Функционал и модули

В проект входят следующие модули (папка `modules/`):

- **Audio.js** — управление звуком (громкость, мьют, ползунок).
- **Background.js** — установка фона (картинка, видео или YouTube-плейлист).
- **Calculator.js / CalculatorUI.js** — калькулятор, встроенный прямо в строку поиска (парсит математические выражения и "X процентов от Y").
- **Countdown.js** — счётчик дней до событий (можно добавлять свои даты).
- **HUD.js** — управление интерфейсом: режим ожидания, скрытие HUD, дропдаун, размытие, зерно.
- **History.js** — история поисковых запросов.
- **Hue.js** — управление цветовой темой (оттенок, яркость, прозрачность, RGB-режим).
- **Notes.js** — блокнот с заметками (закрепление, копирование, drag-n-drop).
- **StickyNotes.js** — стикеры прямо на рабочем столе (перетаскивание, изменение размера, цвета).
- **TimeWidget.js** — секундомер и таймер.
- **Weather.js** — виджет погоды (OpenWeatherMap API).
- **Aim.js** — мини-игра "Aim Trainer" (Убийца ос).
- **Typing.js** — мини-игра на скорость печати (Typing Speed).
- **Achievements.js** — система достижений (тосты при разблокировке).
- **GameIcons.js** — быстрые иконки для запуска игр.
- **Particles.js** — интерактивный фон с частицами (отталкиваются от мыши).
- **Grain.js** — эффект зернистого шума на экране.
- **Glow.js** — эффект свечения (плавающие шары на фоне).
- **Group.js** — группы ссылок (закладки), с возможностью блокировки.
- **Search.js** — поиск (Яндекс/Google).
- **Storage.js** — сохранение, загрузка и сброс конфигурации.

---

## Что было сделано (История правок)

### 1. Улучшения UI/UX и мобильной версии

- Добавлен оверлей для мобильного HUD: на экранах < 768px при открытии меню или заметок появляется затемняющий фон, чтобы интерфейс не «растаскивал» контент. Фон под оверлеем перестаёт скроллиться.
- Исправлены цвета названий групп: убран баг, при котором название группы при наведении (hover) становилось красным. Теперь название группы белое, при наведении подсвечивается акцентным цветом (цветом HUD). Кнопка удаления (крестик) по-прежнему краснеет при наведении, но только у разблокированных групп.
- Починен ползунок шума: слайдер «Интенсивность шума» теперь выглядит идентично остальным слайдерам (Яркость, Прозрачность) — серый трек 4px, круглый акцентный бегунок 16px с белой обводкой. Проблема с «непохожестью» была вызвана дефолтными стилями Chrome для `input[type="range"]`, которые перебивались через вставку `<style>` с `!important` прямо в `<head>`.

### 2. Восстановление эффекта шума и видео

- Починен эффект зерна (шума): восстановлены исходные правила `.grain-overlay` в `styles/grain.css`. Шум снова корректно отображается поверх видео (`z-index: 5`) с настройкой прозрачности через CSS-переменную `--grain-opacity`.
- Исправлено позиционирование фона: видео, картинка и YouTube-iframe снова имеют `position: fixed; z-index: -3`, а размытие (blur) применяется к самому видео и iframe, а не к обёртке.
- Очищен `index.html`: убраны лишние обёртки (`#bgWrapper`), которые ломали работу фона.

### 3. Экспериментальные фичи (удалены)

- Пытались добавить кнопки «Шум/Размытие в спящем режиме» (и в дропдаун, и в виде быстрых кнопок при скрытом HUD). Логика и стили были реализованы, но в итоге фича была полностью удалена, чтобы не перегружать интерфейс.

### 4. Группы в дропдауне (подгруппы с подпунктами)

- **`index.html`** — логические группы дропдауна обёрнуты в `.dropdown-subgroup[data-subgroup-parent]` с подпунктами внутри `.dropdown-subgroup-items`. Родительская кнопка каждой группы вынесена **наружу** `.dropdown-subgroup-items` (внутри `.dropdown-subgroup`), чтобы при сворачивании она оставалась видимой. Затронуты: «Виджет времени», «Счётчик дней», «Зернистый шум», «Частицы», «Режим ожидания», «История поиска», «Стикеры», «Блокировка групп».
- **`modules/DropdownSubgroups.js`** — новый модуль: сканирует `.dropdown-subgroup[data-subgroup-parent]`, находит индикатор по `data-subgroup-parent` (или по первому `.toggle-indicator` внутри), подписывается на `MutationObserver` за классом `off`. При `.off` ставит `.collapsed` на подгруппу и `display: none` на `.dropdown-subgroup-items` (или только CSS-класс — в зависимости от версии). Поддерживает `data-subgroup-invert="true"` — для «Блокировки групп» логика **инвертирована**: когда блокировка **выключена** (`.off`), подгруппа **развёрнута** (видна «Добавить группу»); когда **включена** — свёрнута.
- **`modules/HUD.js`** — в `updateGroupsLockIndicator()` убрано JS-скрытие «Добавить группу» через `style.display` — теперь скрытие через `.collapsed` (CSS), как у остальных подгрупп.
- **`styles/dropdown.css`** — переработан:
  - подгруппа — карточка с **левой акцентной полосой** (`::before`), тускнеющей при `.collapsed`;
  - родитель внутри подгруппы — без рамки и фона (как заголовок карточки);
  - подпункты — утопленные, с точкой-маркером слева (потом убрана);
  - свёрнутое состояние — **плавная анимация** через `max-height` + `opacity` + `transform` (вместо `display: none`);
  - скроллбар — кастомный accent-градиент (desktop/Android), `scrollbar-width` (Firefox), скрыт на мобилке (`@media max-width: 768px`);
  - фон меню и кнопок — `var(--glass)` / `rgba(255,255,255,0.05)`, рамки `accent-soft` / `accent-muted` (как в старом `dropdown.css`);
  - убраны «объёмные» тени (`inset`), hover-`translateY`, градиенты фона у кнопок/меню/кнопки ☰.

### 5. Таймер: уход в минус + красный цвет

- **`modules/TimeWidget.js`** — таймер **не останавливается** на 0: `cdRemaining` уходит в минус, `cdRunning` остаётся `true`, `cdTick` продолжает `requestAnimationFrame`. Флаг `cdOvertime` ставится **один раз** при переходе `+` → `−` (ловится по `prev > 0 && overtime && !cdOvertime`). `cdFormat` поддерживает отрицательные (`-MM:SS`). Звук `cdPlaySound()` вызывается **один раз** при переходе, флаг `_cdSoundPlayed` сбрасывается в `cdSetTime`, `cdReset`, `cdStart` (если старт не из минуса), `restoreState`. Кнопка при overtime — `↺` (сброс + старт). `isActive()` возвращает `true`, пока идёт секундомер или таймер; для показа в режиме сна используются `isSwStarted()` / `isCdStarted()`.
- **`styles/time-widget.cs  ёs`** — добавлены `.overtime` для `.tw-display`, `.time-center-item`, `.top-time-item`: красный цвет + пульсация (`cdFlash`), как у `.finished`.

### 6. Низкая высота вьюпорта (1526×730)

- **`styles/clock.css`** — `.clock` стал `position: relative` (был `absolute`), `margin: 0 auto 12px`, `font-size: clamp(2rem, 6vw, 3.2rem)` — **не наезжает** на поиск. `body.hud-hidden .clock` остался `absolute` (в sleep уезжает вправо).
- **`styles/base.css`** — добавлены `@media (max-height: 800px)` и `@media (max-height: 700px)`: сжатие `.top` (padding, min-height), `.search-input`, `.groups` (margin-bottom), `.countdown-widget` (margin, max-height) — **убирает скролл** страницы на низких экранах.
- **`styles/groups.css`** — группы **сжимаются** на низких экранах: `.group` width `clamp(180px, 18vw, 220px)`, padding `clamp(10px, 1.5vh, 15px)`, `.link` padding/font-size через `clamp`, `@media (max-height: 800px)` → `width: 180px`, `@media (max-height: 700px)` → `width: 160px`. Всё влезает.

### 7. Счётчик дней: glow не обрезается

- **`styles/countdown.css`** — `box-shadow` карточек заменён на **`filter: drop-shadow`** (не обрезается `overflow`/`clip-path` родителя). `max-width: 900px` (3 карточки в ряд), `margin: 8px auto clamp(80px, 10vh, 100px)`, `max-height: 32vh` + `@media` 26vh/24vh. `padding: 20px` у `.countdown-list` — место под glow. `@media (max-height: 800px)` — сжатие карточек.

### 8. Чистка и оптимизация (без изменения внешнего вида)

- **Загрузка CSS**: в `styles.css` было 28 вложенных `@import`, из-за чего стили грузились последовательно (waterfall). Импорты заменены на отдельные `<link rel="stylesheet">` в `index.html` — браузер загружает файлы параллельно. Порядок каскада сохранён, `styles.css` удалён.
- **Внешние ресурсы**: подключение `iconify` переведено на `defer` (не блокирует парсинг страницы), добавлены `preconnect` к `code.iconify.design` и `mc.yandex.ru`.
- **Иконки**: удалены неиспользуемые `icons/icon-512.png` и `icons/icon-maskable-512.png` — они байт-в-байт совпадали с `icon-192.png`, на который ссылается `index.html`.
- **Мёртвый JS** (удалены методы и поля, у которых не было вызовов):
  - `app.js` — `setDrag()`, `isDragging()`, `window.__dragActive`, `window.__dragEndTimer`;
  - `Achievements.js` — `trackPaletteSaved()`;
  - `Background.js` — `unmuteIfNeeded()`;
  - `Clock.js` — `stopClock()`;
  - `Countdown.js` — `stopTick()`;
  - `DropdownSubgroups.js` — `destroy()`, `expandAll()`, `collapseAll()`, `rescan()`;
  - `Grain.js` — `refresh()`, `setOpacity()` (ползунок шума обновляется собственным обработчиком в `init()`);
  - `HUD.js` — `removeActivityListeners()`, `toggleSleepGrain()`, `updateSleepGrainIndicator()`, `toggleSleepBlur()`, `updateSleepBlurIndicator()`, `applySleepStyles()`, `setGrainOpacity()` (кнопок, которые бы их вызывали, в разметке нет);
  - `Particles.js` — `_positionPanel()`;
  - `TimeWidget.js` — `isCdActive()`, `isSwRunning()`, `isCdRunning()` (используются `isSwStarted()` / `isCdStarted()` / `isActive()`);
  - `Hue.js` — поле `_applyPending` и запись неиспользуемых CSS-переменных;
  - `StickyNotes.js`, `TimeWidget.js`, `Weather.js` — неиспользуемое поле `dragRect` (размеры берутся из `getBoundingClientRect()` при перетаскивании).
- **Мёртвый CSS**:
  - `styles/responsive.css` — `.weather-temp`, `.weather-icon`, `.weather-main`, `.weather-details`, `.weather-detail*`, `.time-center-sep` (этих элементов в разметке нет, погода использует `.tw-display`);
  - `styles/particles.css` — `.particles-settings-backdrop`, `.particles-settings-backdrop.visible`;
  - `styles/hue.css` — `body.rgb-mode .weather-city`;
  - `styles/mobile-hud.css` — `body.hud-hidden.sleep-no-grain` и `.sleep-no-blur` (классы больше никем не ставятся);
  - `styles/base.css`, `styles/hue.css` — неиспользуемые переменные `--glass-hover`, `--history-bg`, `--ui-brightness`, `--ui-opacity`, `--accent-dark`, `--accent-muted` (используются только их `-rgb`-варианты).
- **Хранилище**: из `Storage.js` убраны неиспользуемые ключи `sleepGrainEnabled` / `sleepBlurEnabled`. Старые конфиги с этими полями продолжают загружаться без ошибок.
- **Проверка**: меню и подгруппы, ползунок шума, погода, таймер/секундомер и режим сна работают как раньше; ошибок в консоли нет.