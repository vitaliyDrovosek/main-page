import Randomizer from './Randomizer.js';

/**
 * Рандомайзер как отдельный перетаскиваемый виджет — по образцу виджета погоды.
 * Логика генерации живёт в Randomizer.js, здесь только DOM и сохранение позиции.
 */
class RandomizerWidget {
    constructor(app) {
        this.app = app;
        this.widget = null;
        this.indicator = null;
        this.dragHandle = null;

        this._initialized = false;
        this._dragging = false;
        this._els = {};
        this.result = null;

        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.pos = { x: null, y: null };

        this.boundMouseMove = this.onDragMove.bind(this);
        this.boundMouseUp = this.onDragEnd.bind(this);
    }

    init() {
        if (this._initialized) return;
        this._initialized = true;

        this.widget = document.getElementById('randomizerWidget');
        this.indicator = document.getElementById('randomizerIndicator');
        this.dragHandle = document.getElementById('randomizerDrag');
        if (!this.widget) return;

        this._els = {
            value: document.getElementById('randomizerValue'),
            kind: document.getElementById('randomizerKind'),
            detail: document.getElementById('randomizerDetail'),
            min: document.getElementById('randomizerMin'),
            max: document.getElementById('randomizerMax'),
            number: document.getElementById('randomizerNumberBtn'),
            dice: document.getElementById('randomizerDiceBtn'),
            coin: document.getElementById('randomizerCoinBtn')
        };

        this._els.number?.addEventListener('click', () => this.generateNumber());
        this._els.dice?.addEventListener('click', () => this.rollDice());
        this._els.coin?.addEventListener('click', () => this.flipCoin());

        for (const input of [this._els.min, this._els.max]) {
            input?.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                this.generateNumber();
            });
        }

        this.dragHandle?.addEventListener('mousedown', (e) => this.onDragStart(e));
        this.dragHandle?.addEventListener('touchstart', (e) => this.onDragStart(e.touches[0]), { passive: false });

        this.updateVisibility();
        this.restorePosition();
        this.updateIndicator();

        window.addEventListener('resize', () => this.reclampPosition());
        window.addEventListener('orientationchange', () => setTimeout(() => this.reclampPosition(), 150));

        if (this.isEnabled()) this.generateNumber();
    }

    isEnabled() {
        return this.app.data.randomizerEnabled === true;
    }

    toggle() {
        this.app.data.randomizerEnabled = !this.isEnabled();
        this.updateVisibility();
        this.updateIndicator();
        this.app.storage.save();

        if (this.isEnabled()) {
            this.reclampPosition();
            if (!this.result) this.generateNumber();
        }
    }

    updateVisibility() {
        this.widget?.classList.toggle('visible', this.isEnabled());
    }

    updateIndicator() {
        if (this.indicator) {
            this.indicator.classList.toggle('off', !this.isEnabled());
        }
    }

    generateNumber() {
        const min = this._readValue(this._els.min, 1);
        const max = this._readValue(this._els.max, 100);
        const result = Randomizer.randomNumber(min, max);

        if (!result) {
            this._showInvalid();
            return;
        }

        if (this._els.min) this._els.min.value = result.min;
        if (this._els.max) this._els.max.value = result.max;
        this._render(result);
    }

    rollDice() {
        this._render(Randomizer.rollDice(1, 6));
    }

    flipCoin() {
        this._render(Randomizer.flipCoin());
    }

    _readValue(input, fallback) {
        const raw = input?.value?.trim();
        if (raw === undefined || raw === '') return fallback;

        const value = Number(raw);
        return Number.isFinite(value) ? value : fallback;
    }

    _render(result) {
        this.result = result;

        if (this._els.value) {
            this._els.value.textContent = result.value;
            this._els.value.classList.toggle('coin', result.kind === 'coin');
        }
        if (this._els.kind) this._els.kind.textContent = this._kindLabel(result);
        if (this._els.detail) this._els.detail.textContent = result.detail;
    }

    _showInvalid() {
        this.result = null;
        if (this._els.value) {
            this._els.value.textContent = '—';
            this._els.value.classList.remove('coin');
        }
        if (this._els.kind) this._els.kind.textContent = 'Ошибка';
        if (this._els.detail) this._els.detail.textContent = 'Проверьте диапазон';
    }

    _kindLabel(result) {
        if (result.kind === 'dice') {
            return result.label.split('·').pop().trim();
        }
        if (result.kind === 'coin') return 'Монетка';
        return 'Число';
    }

    // ---------- Перетаскивание ----------

    onDragStart(e) {
        if (!e || !this.widget) return;
        e.preventDefault?.();
        const rect = this.widget.getBoundingClientRect();
        this._dragging = true;
        this.dragOffsetX = e.clientX - rect.left;
        this.dragOffsetY = e.clientY - rect.top;
        this.widget.classList.add('dragging');

        document.addEventListener('mousemove', this.boundMouseMove);
        document.addEventListener('mouseup', this.boundMouseUp);
        document.addEventListener('touchmove', this.boundMouseMove, { passive: false });
        document.addEventListener('touchend', this.boundMouseUp);
    }

    onDragMove(e) {
        if (!this._dragging || !this.widget) return;
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
        if (!this._dragging || !this.widget) return;
        this._dragging = false;
        this.widget.classList.remove('dragging');

        document.removeEventListener('mousemove', this.boundMouseMove);
        document.removeEventListener('mouseup', this.boundMouseUp);
        document.removeEventListener('touchmove', this.boundMouseMove);
        document.removeEventListener('touchend', this.boundMouseUp);

        this.app.data.randomizerPos = { x: this.pos.x, y: this.pos.y };
        this.app.storage.save();
    }

    restorePosition() {
        if (!this.widget) return;
        const saved = this.app.data.randomizerPos;
        if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
            if (this.isEnabled()) {
                this._applyPosition(saved.x, saved.y);
            } else {
                // Пока виджет скрыт, его размеры нулевые — позицию применим без зажима,
                // а границы проверим при включении, когда размеры уже известны.
                this.pos = { x: saved.x, y: saved.y };
                this.widget.style.left = saved.x + 'px';
                this.widget.style.top = saved.y + 'px';
                this.widget.style.right = 'auto';
                this.widget.style.bottom = 'auto';
            }
            return;
        }

        this.pos = { x: null, y: null };
        this.widget.style.left = 'auto';
        this.widget.style.right = 'calc(20px + var(--safe-right))';
        this.widget.style.top = 'auto';
        this.widget.style.bottom = 'calc(90px + var(--safe-bottom))';
    }

    _measureSize() {
        if (!this.widget) return { width: 230, height: 260 };
        const rect = this.widget.getBoundingClientRect();
        return {
            width: rect.width || this.widget.offsetWidth || 230,
            height: rect.height || this.widget.offsetHeight || 260
        };
    }

    _clampPosition(x, y) {
        const margin = 10;
        // На мобильной ширине снизу остаётся место для кнопки меню.
        const bottomReserved = window.innerWidth <= 768 ? 80 : margin;
        const { width, height } = this._measureSize();
        const maxX = Math.max(margin, window.innerWidth - width - margin);
        const maxY = Math.max(margin, window.innerHeight - height - bottomReserved);
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

    reclampPosition() {
        if (!this.widget || this.pos.x === null || this.pos.y === null) return;
        this._applyPosition(this.pos.x, this.pos.y);
    }
}

export default RandomizerWidget;
