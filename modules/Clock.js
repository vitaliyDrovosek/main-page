class Clock {
    constructor(app) {
        this.app = app;
        this.el = null;
        this.centerEl = null;
        this.interval = null;
    }

    init() {
        this.el = document.getElementById('clock');
        this.centerEl = document.getElementById('timeCenterClock');
        this.startClock();
    }

    startClock() {
        this.updateClock();
        this.interval = setInterval(() => this.updateClock(), 1000);
    }

    updateClock() {
        const text = new Date().toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        if (this.el) this.el.textContent = text;
        if (this.centerEl) this.centerEl.textContent = text;
    }
}

export default Clock;
