class Weather {
    constructor(app) {
        this.app = app;
        this.widget = null;
        this.indicator = null;
        this.dragHandle = null;
        this.interval = null;

        // Ключ OpenWeatherMap. Не публикуй в открытом репозитории.
        this.API_KEY = 'fec5256dfac4d4d59519eda0a8cb1c7e';
        this.LAT = 54.9924;
        this.LON = 73.3686;

        this._abortController = null;
        this._initialized = false;
        this._dragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.pos = { x: null, y: null };

        this._els = {};

        this.boundMouseMove = this.onDragMove.bind(this);
        this.boundMouseUp = this.onDragEnd.bind(this);
    }

    init() {
        if (this._initialized) return;
        this._initialized = true;

        this.widget = document.getElementById('weatherWidget');
        this.indicator = document.getElementById('weatherIndicator');
        this.dragHandle = document.getElementById('weatherDrag');

        this._els = {
            temp:   document.getElementById('weatherTemp'),
            hum:    document.getElementById('weatherHumidity'),
            wind:   document.getElementById('weatherWind'),
            press:  document.getElementById('weatherPressure'),
            feels:  document.getElementById('weatherFeels'),
            update: document.getElementById('weatherUpdate')
        };

        this.dragHandle?.addEventListener('mousedown', (e) => this.onDragStart(e));
        this.dragHandle?.addEventListener('touchstart', (e) => this.onDragStart(e.touches[0]), { passive: false });

        document.getElementById('weatherRefreshBtn')?.addEventListener('click', () => this.fetch());

        this.restorePosition();
        this.updateIndicator();

        window.addEventListener('resize', () => this.reclampPosition());
        window.addEventListener('orientationchange', () => setTimeout(() => this.reclampPosition(), 150));

        if (this.app.data.weatherEnabled) {
            this.widget?.classList.add('visible');
            this.reclampPosition();
            this.fetch();
            this._startAutoRefresh();
        }
    }

    updateIndicator() {
        if (this.indicator) {
            this.indicator.classList.toggle('off', !this.app.data.weatherEnabled);
        }
    }

    _startAutoRefresh() {
        this._stopAutoRefresh();
        this.interval = setInterval(() => this.fetch(), 600000);
    }

    _stopAutoRefresh() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    async fetch() {
        if (this._abortController) this._abortController.abort();
        this._abortController = new AbortController();

        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${this.LAT}&lon=${this.LON}&appid=${this.API_KEY}&units=metric&lang=ru`;

        try {
            const response = await fetch(url, { signal: this._abortController.signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (!data || !data.main) {
                console.warn('[Weather] Unexpected response:', data);
                return;
            }

            const city = data.name || 'Город';
            const els = this._els;

            if (els.temp)  els.temp.textContent  = `${Math.round(data.main.temp)}°C`;
            if (els.hum)   els.hum.textContent   = `${data.main.humidity}%`;
            if (els.wind)  els.wind.textContent  = `${Math.round((data.wind?.speed ?? 0) * 10) / 10} м/с`;
            if (els.press) els.press.textContent = `${Math.round(data.main.pressure * 0.75)} мм`;
            if (els.feels) els.feels.textContent = `${Math.round(data.main.feels_like)}°C`;
            if (els.update) els.update.textContent = city;
        } catch (err) {
            if (err?.name === 'AbortError') return;
            console.warn('[Weather] fetch error:', err);
        } finally {
            this._abortController = null;
        }
    }

    toggle() {
        this.app.data.weatherEnabled = !this.app.data.weatherEnabled;
        this.updateIndicator();
        this.widget?.classList.toggle('visible', this.app.data.weatherEnabled);

        if (this.app.data.weatherEnabled) {
            this.reclampPosition();
            this.fetch();
            this._startAutoRefresh();
        } else {
            this._stopAutoRefresh();
        }
        this.app.storage.save();
    }

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

        this.app.data.weatherPos = { x: this.pos.x, y: this.pos.y };
        this.app.storage.save();
    }

    restorePosition() {
        if (!this.widget) return;
        const saved = this.app.data.weatherPos;
        if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
            this._applyPosition(saved.x, saved.y);
        } else {
            this.pos = { x: null, y: null };
            this.widget.style.left = 'auto';
            this.widget.style.right = '20px';
            this.widget.style.top = '20px';
            this.widget.style.bottom = 'auto';
        }
    }

    // ---------- Положение и адаптивность ----------

    _measureSize() {
        if (!this.widget) return { width: 220, height: 240 };
        const rect = this.widget.getBoundingClientRect();
        return {
            width: rect.width || this.widget.offsetWidth || 240,
            height: rect.height || this.widget.offsetHeight || 240
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
}

export default Weather;