class TimeWidget {
    constructor(app) {
        this.app = app;
        this.widget = null;
        this.dragHandle = null;

        this.swDisplay = null; this.swStartBtn = null; this.swLapBtn = null;
        this.swResetBtn = null; this.swLapsList = null;
        this.swRunning = false; this.swStartTime = 0; this.swElapsed = 0;
        this.swRafId = null; this.swLaps = []; this.swLastLapTime = 0;

        this.cdDisplay = null; this.cdStartBtn = null; this.cdResetBtn = null;
        this.cdPresetsEl = null;
        this.cdRunning = false; this.cdTotal = 0; this.cdRemaining = 0;
        this.cdEndTime = 0; this.cdRafId = null;
        this.cdFinished = false;
        this.cdOvertime = false;
        this._cdSoundPlayed = false;

        this.PRESETS = [1, 5, 10, 15, 25, 60];

        this.dragging = false; this.dragOffsetX = 0; this.dragOffsetY = 0;
        this.pos = { x: 20, y: 0 };

        this.centerEl = null; this.centerSwEl = null; this.centerCdEl = null;
        this.centerClockEl = null;
        this.clockEl = null;
        this._centerVisible = false;

        this.topSwEl = null; this.topCdEl = null;

        this.saveInterval = null;
        this._lastSavedStateJson = '';
        this._saveIntervalMs = 2000;
        this._audioCtx = null;
        this._initialized = false;

        this.boundMouseMove = this.onDragMove.bind(this);
        this.boundMouseUp = this.onDragEnd.bind(this);
        this.boundTouchMove = this.onDragMove.bind(this);
        this.boundTouchEnd = this.onDragEnd.bind(this);
    }

    init() {
        if (this._initialized) return;
        this._initialized = true;

        this.widget = document.getElementById('timeWidget');
        if (!this.widget) return;
        this.dragHandle = document.getElementById('timeWidgetDrag');
        this.swDisplay = document.getElementById('swDisplay');
        this.swStartBtn = document.getElementById('swStartBtn');
        this.swLapBtn = document.getElementById('swLapBtn');
        this.swResetBtn = document.getElementById('swResetBtn');
        this.swLapsList = document.getElementById('swLaps');
        this.cdDisplay = document.getElementById('cdDisplay');
        this.cdStartBtn = document.getElementById('cdStartBtn');
        this.cdResetBtn = document.getElementById('cdResetBtn');
        this.cdPresetsEl = document.getElementById('cdPresets');
        this.centerEl = document.getElementById('timeCenter');
        this.centerSwEl = document.getElementById('timeCenterSw');
        this.centerCdEl = document.getElementById('timeCenterCd');
        this.centerClockEl = document.getElementById('timeCenterClock');
        this.clockEl = document.getElementById('clock');
        this.topSwEl = document.getElementById('topSwDisplay');
        this.topCdEl = document.getElementById('topCdDisplay');
        this._fixTopWidths();

        this.swStartBtn?.addEventListener('click', () => this.swToggle());
        this.swLapBtn?.addEventListener('click', () => this.swLap());
        this.swResetBtn?.addEventListener('click', () => this.swReset());
        this.cdStartBtn?.addEventListener('click', () => this.cdToggle());
        this.cdResetBtn?.addEventListener('click', () => this.cdReset());

        this.renderPresets();
        this.restorePosition();
        this.restoreState();
        this.dragHandle?.addEventListener('mousedown', (e) => this.onDragStart(e));
        this.dragHandle?.addEventListener('touchstart', (e) => this.onDragStart(e.touches[0]), { passive: false });
        window.addEventListener('resize', () => {
            this.reclampPosition();
            this._positionTopDisplay();
            this.updateCenter();
        });
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.reclampPosition(), 150);
        });
        this.updateVisibility();
        this.updateIndicator();
        this.updateSleepDisplayIndicator();
        this.updateClockDisplayIndicator();
        this.renderSleepTime();

        this._refreshAutoSave();
    }

    // ---------- Автосохранение ----------

    _refreshAutoSave() {
        const need = this.isActive();
        if (need && !this.saveInterval) {
            this.saveInterval = setInterval(() => this.saveState(), this._saveIntervalMs);
        } else if (!need && this.saveInterval) {
            clearInterval(this.saveInterval);
            this.saveInterval = null;
        }
    }

    saveState() {
        if (!this.app?.data) return;
        if (!this.isActive()) return;

        const state = {
            swRunning: this.swRunning,
            swElapsed: this.swElapsed,
            swStartTimeAbs: this.swRunning ? Date.now() - this.swElapsed : 0,
            swLaps: this.swLaps,
            swLastLapTime: this.swLastLapTime,
            cdRunning: this.cdRunning,
            cdTotal: this.cdTotal,
            cdRemaining: this.cdRemaining,
            cdEndTimeAbs: this.cdRunning ? Date.now() + this.cdRemaining : 0,
            cdFinished: this.cdFinished,
            cdOvertime: this.cdOvertime
        };

        let json;
        try { json = JSON.stringify(state); } catch { return; }
        if (json === this._lastSavedStateJson) return;
        this._lastSavedStateJson = json;

        this.app.data.timeWidgetState = state;
        this.app.storage.save();
    }

    restoreState() {
        const s = this.app.data?.timeWidgetState;
        if (!s) return;

        const num = (v, def) => Number.isFinite(Number(v)) ? Number(v) : def;

        this.swLaps = Array.isArray(s.swLaps) ? s.swLaps : [];
        this.swLastLapTime = num(s.swLastLapTime, 0);

        if (s.swRunning && s.swStartTimeAbs) {
            this.swElapsed = Math.max(0, Date.now() - num(s.swStartTimeAbs, 0));
            this.swRunning = true;
            this.swStartTime = performance.now() - this.swElapsed;
            this.swTick();
            this.swUpdateButton();
        } else {
            this.swElapsed = num(s.swElapsed, 0);
            this.swRunning = false;
            this.swRender();
            this.swUpdateButton();
        }
        this.swRenderLaps();

        this.cdTotal = num(s.cdTotal, 0);
        if (s.cdRunning && s.cdEndTimeAbs) {
            const remaining = num(s.cdEndTimeAbs, 0) - Date.now();
            this.cdRemaining = remaining;
            this.cdRunning = true;
            this.cdFinished = false;
            this.cdOvertime = remaining <= 0;
            this.cdEndTime = performance.now() + remaining;
            this.cdTick();
        } else {
            this.cdRemaining = num(s.cdRemaining, 0);
            this.cdRunning = false;
            this.cdFinished = !!s.cdFinished;
            this.cdOvertime = s.cdOvertime === true || this.cdRemaining <= 0;
            this.cdRender();
        }
        this.cdUpdateButton();
        this.updateCenter();
        this._syncTopDisplay();
    }

    // ---------- Спящий режим ----------

    toggleSleepDisplay() {
        this.app.data.timeCenterInSleepEnabled = this.app.data.timeCenterInSleepEnabled === false;
        this.updateSleepDisplayIndicator();
        this.app.storage.save();
        this.renderSleepTime();
    }

    toggleClockDisplay() {
        this.app.data.timeCenterInClockEnabled = this.app.data.timeCenterInClockEnabled !== true;
        // Выбор положения подразумевает, что показ времени в режиме сна включён.
        this.app.data.timeCenterInSleepEnabled = true;
        this.updateSleepDisplayIndicator();
        this.updateClockDisplayIndicator();
        this.app.storage.save();
        this.renderSleepTime();
    }

    updateClockDisplayIndicator() {
        const el = document.getElementById('timeCenterClockIndicator');
        if (el) el.classList.toggle('off', this.app.data.timeCenterInClockEnabled !== true);
    }

    updateSleepDisplayIndicator() {
        const indicator = document.getElementById('timeCenterSleepIndicator');
        if (indicator) {
            indicator.classList.toggle('off', this.app.data.timeCenterInSleepEnabled === false);
        }
    }

    isSwActive() { return this.swRunning || this.swElapsed > 0; }
    isActive() { return this.swRunning || this.cdRunning; }

    /**
     * Для режима сна показываем только то, что реально было запущено:
     * сброшенный таймер (cdRemaining === cdTotal) считается выключенным.
     */
    isSwStarted() {
        return this.isSwActive();
    }

    isCdStarted() {
        return this.cdRunning || this.cdFinished || this.cdOvertime ||
            (this.cdTotal > 0 && this.cdRemaining > 0 && this.cdRemaining < this.cdTotal);
    }

    updateVisibility() {
        if (!this.widget) return;
        this.widget.classList.toggle('visible', this.app.data.timeWidgetEnabled === true);
    }

    toggle() {
        this.app.data.timeWidgetEnabled = !this.app.data.timeWidgetEnabled;
        this.updateVisibility();
        this.updateIndicator();
        this.reclampPosition();
        this._refreshAutoSave();
        this._syncTopDisplay();
        this.app.storage.save();
    }

    updateIndicator() {
        const indicator = document.getElementById('timeWidgetIndicator');
        if (indicator) indicator.classList.toggle('off', !this.app.data.timeWidgetEnabled);
    }

    // ---------- Верхний блок ----------

    _fixTopWidths() {
        const sw = this.topSwEl;
        const cd = this.topCdEl;
        if (!sw && !cd) return;

        const measure = (el, samples) => {
            if (!el) return;
            const prev = el.textContent;
            el.style.minWidth = '';
            el.style.width = '';
            let max = 0;
            for (const s of samples) {
                el.textContent = s;
                const w = el.offsetWidth;
                if (w > max) max = w;
            }
            el.textContent = prev;
            if (max > 0) {
                el.style.width = '';
                el.style.minWidth = max + 'px';
            }
        };

        const swSamples = [];
        for (let i = 0; i <= 9; i++) {
            swSamples.push(`${i}${i}.${i}${i}с`);
        }
        measure(sw, swSamples);

        const cdSamples = [];
        for (let i = 0; i <= 9; i++) {
            cdSamples.push(`${i}${i}:${i}${i}`);
        }
        measure(cd, cdSamples);
    }

    _syncTopDisplay() {
        if (!this.topSwEl && !this.topCdEl) return;

        const sleeping = document.body.classList.contains('hud-hidden');
        const showSw = sleeping
            ? this.isSwStarted()
            : (this.swRunning || this.swElapsed > 0);
        const showCd = sleeping
            ? this.isCdStarted()
            : (this.cdRunning || this.cdRemaining !== 0 || this.cdOvertime || this.cdFinished);

        if (this.topSwEl) {
            this.topSwEl.classList.toggle('hidden', !showSw);
            if (showSw) this.topSwEl.textContent = this.swFormat(this.swElapsed);
        }
        if (this.topCdEl) {
            this.topCdEl.classList.toggle('hidden', !showCd);
            if (showCd) {
                this.topCdEl.textContent = this.cdFormat(this.cdRemaining);
                this.topCdEl.classList.toggle('finished', this.cdFinished);
                this.topCdEl.classList.toggle('overtime', this.cdOvertime);
            }
        }

        this._positionTopDisplay();
    }

    _positionTopDisplay() {
        const clock = document.getElementById('clock');
        if (!clock) return;

        const clockRect = clock.getBoundingClientRect();
        const parent = clock.parentElement;
        const parentRect = parent ? parent.getBoundingClientRect() : { right: window.innerWidth, top: 0 };
        const gap = 10;
        const baseRight = parentRect.right - clockRect.left + gap;

        const els = [this.topSwEl, this.topCdEl].filter(el => el && !el.classList.contains('hidden'));
        let acc = baseRight;

        for (const el of els) {
            el.style.right = acc + 'px';
            el.style.left = 'auto';
            el.style.top = (clockRect.top - (parentRect.top || 0)) + 'px';
            const w = el.offsetWidth || 0;
            acc += w + gap;
        }
    }

    // ---------- Время в режиме сна ----------

    isSleepTimeEnabled() {
        return this.app.data.timeCenterInSleepEnabled !== false;
    }

    isSleepTimeNearClock() {
        return this.app.data.timeCenterInClockEnabled === true;
    }

    /**
     * Синхронизирует режим отображения времени во сне.
     * - настройка выключена: таймер/секундомер в режиме сна не показываются;
     * - включена + «у часов» выключено: центральный квадрат с часами, таймером и секундомером;
     * - включена + «у часов» включено: время рядом с часами в правом верхнем углу.
     */
    renderSleepTime() {
        if (!this.centerEl) return;

        const sleeping = document.body.classList.contains('hud-hidden');
        const enabled = this.isSleepTimeEnabled();
        const nearClock = this.isSleepTimeNearClock();
        const centerMode = sleeping && enabled && !nearClock;

        document.body.classList.toggle('sleep-time-center', centerMode);
        document.body.classList.toggle('sleep-time-off', sleeping && !enabled);

        this.centerEl.classList.toggle('visible', centerMode);
        this._centerVisible = centerMode;

        if (centerMode) this.updateCenter();

        this._syncTopDisplay();
    }

    updateCenter() {
        if (!this.centerEl || !this._centerVisible) return;

        if (this.centerClockEl) {
            const clockText = this.clockEl?.textContent;
            if (clockText && this.centerClockEl.textContent !== clockText) {
                this.centerClockEl.textContent = clockText;
            }
        }

        const showSw = this.isSwStarted();
        const showCd = this.isCdStarted();

        if (this.centerSwEl) {
            this.centerSwEl.classList.toggle('hidden', !showSw);
            if (showSw) this.centerSwEl.textContent = this.swFormat(this.swElapsed);
        }
        if (this.centerCdEl) {
            this.centerCdEl.classList.toggle('hidden', !showCd);
            if (showCd) {
                this.centerCdEl.textContent = this.cdFormat(this.cdRemaining);
                this.centerCdEl.classList.toggle('finished', this.cdFinished);
                this.centerCdEl.classList.toggle('overtime', this.cdOvertime);
            }
        }
    }

    hideCenter() {
        this.centerEl?.classList.remove('visible');
        this._centerVisible = false;
        document.body.classList.remove('sleep-time-center', 'sleep-time-off');
    }

    // ---------- Drag ----------

    onDragStart(e) {
        if (!e) return;
        e.preventDefault?.();
        const rect = this.widget.getBoundingClientRect();
        this.dragging = true;
        this.dragOffsetX = e.clientX - rect.left;
        this.dragOffsetY = e.clientY - rect.top;
        this.widget.classList.add('dragging');
        document.addEventListener('mousemove', this.boundMouseMove);
        document.addEventListener('mouseup', this.boundMouseUp);
        document.addEventListener('touchmove', this.boundTouchMove, { passive: false });
        document.addEventListener('touchend', this.boundTouchEnd);
    }

    onDragMove(e) {
        if (!this.dragging) return;
        if (e.touches) e.preventDefault();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        const p = this._clampPosition(cx - this.dragOffsetX, cy - this.dragOffsetY);
        this.widget.style.left = p.x + 'px';
        this.widget.style.top = p.y + 'px';
        this.widget.style.right = 'auto';
        this.widget.style.bottom = 'auto';
        this.pos.x = p.x;
        this.pos.y = p.y;
    }

    onDragEnd() {
        if (!this.dragging) return;
        this.dragging = false;
        this.widget.classList.remove('dragging');
        document.removeEventListener('mousemove', this.boundMouseMove);
        document.removeEventListener('mouseup', this.boundMouseUp);
        document.removeEventListener('touchmove', this.boundTouchMove);
        document.removeEventListener('touchend', this.boundTouchEnd);
        this.app.data.timeWidgetPos = { x: this.pos.x, y: this.pos.y };
        this.app.storage.save();
    }

    restorePosition() {
        if (!this.widget) return;
        const saved = this.app.data.timeWidgetPos;
        if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
            this._applyPosition(saved.x, saved.y);
        } else {
            this.pos = { x: null, y: null };
            this.widget.style.left = '20px';
            this.widget.style.right = 'auto';
            this.widget.style.bottom = '20px';
            this.widget.style.top = 'auto';
        }
    }

    // ---------- Положение и адаптивность ----------

    _measureSize() {
        if (!this.widget) return { width: 240, height: 320 };
        const rect = this.widget.getBoundingClientRect();
        return {
            width: rect.width || this.widget.offsetWidth || 240,
            height: rect.height || this.widget.offsetHeight || 320
        };
    }

    _clampPosition(x, y) {
        const margin = 10;
        const { width, height } = this._measureSize();
        const maxX = Math.max(margin, window.innerWidth - width - margin);
        const maxY = Math.max(margin, window.innerHeight - height - margin);
        return {
            x: Math.min(Math.max(margin, x), maxX),
            y: Math.min(Math.max(margin, y), maxY)
        };
    }

    _applyPosition(x, y) {
        if (!this.widget) return;
        const p = this._clampPosition(x, y);
        this.pos = p;
        this.widget.style.left = p.x + 'px';
        this.widget.style.top = p.y + 'px';
        this.widget.style.right = 'auto';
        this.widget.style.bottom = 'auto';
    }

    // Возвращает виджет в пределы экрана после поворота/изменения размера окна.
    reclampPosition() {
        if (!this.widget || this.pos.x === null || this.pos.y === null) return;
        this._applyPosition(this.pos.x, this.pos.y);
    }

    // ---------- Секундомер ----------

    swToggle() { this.swRunning ? this.swPause() : this.swStart(); }

    swStart() {
        if (this.swRunning) return;
        this.swRunning = true;
        this.swStartTime = performance.now() - this.swElapsed;
        this.swTick();
        this.swUpdateButton();
        this.app.hud?.resetTimer();
        this._syncTopDisplay();
        this._refreshAutoSave();
        this.saveState();
    }

    swPause() {
        if (!this.swRunning) return;
        this.swRunning = false;
        cancelAnimationFrame(this.swRafId);
        this.swRafId = null;
        this.swUpdateButton();
        this.app.hud?.resetTimer();
        this._refreshAutoSave();
        this.saveState();
    }

    swReset() {
        this.swPause();
        this.swElapsed = 0;
        this.swLaps = [];
        this.swLastLapTime = 0;
        this.swRender();
        this.swRenderLaps();
        this.swUpdateButton();
        this._syncTopDisplay();
        this.updateCenter();
        this.saveState();
    }

    swLap() {
        if (!this.swRunning) return;
        const total = this.swElapsed;
        const diff = total - this.swLastLapTime;
        this.swLastLapTime = total;
        this.swLaps.unshift({ total, diff });
        this.swRenderLaps();
        this.saveState();
    }

    swTick() {
        this.swElapsed = performance.now() - this.swStartTime;
        this.swRender();
        this._syncTopDisplay();
        this.updateCenter();
        if (this.swRunning) {
            this.swRafId = requestAnimationFrame(() => this.swTick());
        }
    }

    _formatDuration(ms) {
        const negative = ms < 0;
        // Таймер округляет остаток вверх, чтобы 0.2 с ещё показывались как 00:01.
        const totalSeconds = Math.ceil(Math.abs(ms) / 1000);

        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const pad = (n) => String(n).padStart(2, '0');
        const sign = negative ? '-' : '';

        if (days > 0) {
            return `${sign}${days}д ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        }
        if (hours > 0) {
            return `${sign}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        }
        return `${sign}${pad(minutes)}:${pad(seconds)}`;
    }

    swFormat(ms) {
        // Секундомер показываем с подписями единиц: 6д 15ч 28м 46с.
        const totalMs = Math.max(0, ms);
        const totalSeconds = Math.floor(totalMs / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const pad = (n) => String(n).padStart(2, '0');

        if (days > 0) {
            return `${days}д ${pad(hours)}ч ${pad(minutes)}м ${pad(seconds)}с`;
        }
        if (hours > 0) {
            return `${hours}ч ${pad(minutes)}м ${pad(seconds)}с`;
        }
        if (minutes > 0) {
            return `${minutes}м ${pad(seconds)}с`;
        }
        const centiseconds = Math.floor((totalMs % 1000) / 10);
        return `${seconds}.${pad(centiseconds)}с`;
    }

    swRender() {
        if (this.swDisplay) this.swDisplay.textContent = this.swFormat(this.swElapsed);
    }

    swRenderLaps() {
        if (!this.swLapsList) return;
        if (this.swLaps.length === 0) {
            this.swLapsList.replaceChildren();
            this.swLapsList.classList.remove('has-laps');
            return;
        }
        this.swLapsList.classList.add('has-laps');

        const fragment = document.createDocumentFragment();
        const n = this.swLaps.length;
        for (let i = 0; i < n; i++) {
            const l = this.swLaps[i];
            const row = document.createElement('div');
            row.className = 'tw-lap-row';

            const num = document.createElement('span');
            num.className = 'tw-lap-num';
            num.textContent = `Круг ${n - i}`;

            const diff = document.createElement('span');
            diff.className = 'tw-lap-diff';
            diff.textContent = `+${this.swFormat(l.diff)}`;

            row.append(num, diff);
            fragment.appendChild(row);
        }
        this.swLapsList.replaceChildren(fragment);
    }

    swUpdateButton() {
        if (!this.swStartBtn) return;
        this.swStartBtn.textContent = this.swRunning ? '⏸' : '▶';
        this.swStartBtn.title = this.swRunning ? 'Пауза секундомера' : 'Запустить секундомер';
    }

    // ---------- Таймер ----------

    renderPresets() {
        if (!this.cdPresetsEl) return;
        this.cdPresetsEl.innerHTML = this.PRESETS.map(m =>
            `<button class="tw-preset" data-min="${m}" title="Установить таймер на ${m} мин">${m}м</button>`).join('') + `
            <input type="number" class="tw-custom-input" id="cdCustomInput" min="1" max="999" placeholder="мин"
                title="Своё значение таймера в минутах">
            <button class="tw-preset" id="cdCustomApply" title="Применить введённое значение">OK</button>`;
        this.cdPresetsEl.querySelectorAll('.tw-preset[data-min]').forEach(btn => {
            btn.addEventListener('click', () => this.cdSetTime(parseInt(btn.dataset.min, 10) * 60 * 1000));
        });
        document.getElementById('cdCustomApply')?.addEventListener('click', () => {
            const v = parseInt(document.getElementById('cdCustomInput')?.value, 10);
            if (v > 0 && v <= 999) this.cdSetTime(v * 60 * 1000);
        });
    }

    cdSetTime(ms) {
        this.cdPause();
        this.cdTotal = ms;
        this.cdRemaining = ms;
        this.cdFinished = false;
        this.cdOvertime = false;
        this._cdSoundPlayed = false;
        this.cdRender();
        this.cdUpdateButton();
        this._syncTopDisplay();
        this.updateCenter();
        this.saveState();
    }

    cdToggle() {
        if (this.cdOvertime || this.cdFinished) { this.cdReset(); this.cdStart(); return; }
        if (this.cdRemaining <= 0 && !this.cdRunning) return;
        this.cdRunning ? this.cdPause() : this.cdStart();
    }

    cdStart() {
        if (this.cdRunning) return;
        if (this.cdRemaining <= 0 && !this.cdOvertime) return;
        this.cdRunning = true;
        this.cdFinished = false;
        this.cdEndTime = performance.now() + this.cdRemaining;
        this.cdTick();
        this.cdUpdateButton();
        this.app.hud?.resetTimer();
        this._syncTopDisplay();
        this._refreshAutoSave();
        this.saveState();
    }

    cdPause() {
        if (!this.cdRunning) return;
        this.cdRunning = false;
        cancelAnimationFrame(this.cdRafId);
        this.cdRafId = null;
        this.cdUpdateButton();
        this.app.hud?.resetTimer();
        this._refreshAutoSave();
        this.saveState();
    }

    cdReset() {
        this.cdPause();
        this.cdRemaining = this.cdTotal;
        this.cdFinished = false;
        this.cdOvertime = false;
        this._cdSoundPlayed = false;
        this.cdRender();
        this.cdUpdateButton();
        this._syncTopDisplay();
        this.updateCenter();
        this.saveState();
    }

    cdTick() {
        this.cdRemaining = this.cdEndTime - performance.now();
        const overtime = this.cdRemaining <= 0;

        if (overtime && !this.cdOvertime) {
            this.cdOvertime = true;
            if (!this._cdSoundPlayed) {
                this._cdSoundPlayed = true;
                this.cdPlaySound();
            }
        }

        this.cdRender();
        this._syncTopDisplay();
        this.updateCenter();

        if (this.cdRunning) {
            this.cdRafId = requestAnimationFrame(() => this.cdTick());
        }
    }

    cdFormat(ms) {
        return this._formatDuration(ms);
    }

    cdRender() {
        if (this.cdDisplay) {
            this.cdDisplay.textContent = this.cdFormat(this.cdRemaining);
            this.cdDisplay.classList.toggle('finished', this.cdFinished);
            this.cdDisplay.classList.toggle('overtime', this.cdOvertime);
        }
    }

    cdUpdateButton() {
        if (!this.cdStartBtn) return;
        if (this.cdOvertime || this.cdFinished) {
            this.cdStartBtn.textContent = '↺';
            this.cdStartBtn.title = 'Перезапустить таймер';
        } else if (this.cdRunning) {
            this.cdStartBtn.textContent = '⏸';
            this.cdStartBtn.title = 'Пауза таймера';
        } else {
            this.cdStartBtn.textContent = '▶';
            this.cdStartBtn.title = 'Запустить таймер';
        }
    }

    // ---------- Звук ----------

    _getAudioCtx() {
        if (this._audioCtx) return this._audioCtx;
        try {
            this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch {
            this._audioCtx = null;
        }
        return this._audioCtx;
    }

    cdPlaySound() {
        const ctx = this._getAudioCtx();
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});

        try {
            const now = ctx.currentTime;
            [880, 1100, 1320].forEach((f, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, now + i * 0.2);
                gain.gain.setValueAtTime(0.001, now + i * 0.2);
                gain.gain.exponentialRampToValueAtTime(0.15, now + i * 0.2 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.3);
                osc.start(now + i * 0.2);
                osc.stop(now + i * 0.2 + 0.35);
            });
        } catch { /* ignore */ }
    }
}

export default TimeWidget;