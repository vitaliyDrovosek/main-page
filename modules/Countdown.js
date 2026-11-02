class Countdown {
    constructor(app) {
        this.app = app;
        this.container = null;
        this.enabled = false;
        this.pinned = false;
        this.interval = null;
        this._initialized = false;
    }

    init() {
        if (this._initialized) {
            
            this.enabled = this.app.data.countdownEnabled === true;
            this.pinned = this.app.data.countdownPinned === true;
            this.updateVisibility();
            this.updateIndicator();
            this.updatePinIndicator();
            this.render();
            return;
        }
        this._initialized = true;

        this.container = document.getElementById('countdownWidget');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'countdownWidget';
            this.container.className = 'countdown-widget';

            const groups = document.getElementById('groups');
            if (groups && groups.parentNode) {
                groups.parentNode.insertBefore(this.container, groups.nextSibling);
            } else {
                document.body.appendChild(this.container);
            }
        }

        this.enabled = this.app.data.countdownEnabled === true;
        this.pinned = this.app.data.countdownPinned === true;

        this.updateVisibility();
        this.updateIndicator();
        this.updatePinIndicator();  
        this.render();
        this.startTick();
    }

    updateVisibility() {
        if (!this.container) return;
        this.container.classList.toggle('visible', this.enabled);
    }

    toggle() {
        this.enabled = !this.enabled;
        this.app.data.countdownEnabled = this.enabled;
        this.updateVisibility();
        this.updateIndicator();
        this.render(); 
        this.app.storage.save();
    }

    togglePin() {
        this.pinned = !this.pinned;
        this.app.data.countdownPinned = this.pinned;
        this.updatePinIndicator();
        this.render();
        this.app.storage.save();
    }

    updateIndicator() {
        const indicator = document.getElementById('countdownIndicator');
        if (indicator) indicator.classList.toggle('off', !this.enabled);
    }

    updatePinIndicator() {
        const indicator = document.getElementById('countdownPinIndicator');
        if (indicator) indicator.classList.toggle('off', !this.pinned);
    }

    

    getEvents() {
        if (!Array.isArray(this.app.data.countdownEvents)) {
            this.app.data.countdownEvents = [];
        }
        return this.app.data.countdownEvents;
    }

    genId() {
        return 'cd_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }

    
    parseLocalDate(str) {
        if (!str) return null;
        const m = String(str).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return null;
        const y = +m[1], mo = +m[2], d = +m[3];
        if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
        const dt = new Date(y, mo - 1, d, 0, 0, 0, 0);
        
        if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
            return null;
        }
        return dt.getTime();
    }

    addEvent() {
        const name = prompt('Название события:');
        if (!name) return;

        const dateStr = prompt('Дата (в формате ГГГГ-ММ-ДД):');
        if (!dateStr) return;

        const ts = this.parseLocalDate(dateStr);
        if (ts === null) {
            alert('Неверный формат даты. Используй ГГГГ-ММ-ДД');
            return;
        }

        const events = this.getEvents();
        events.push({
            id: this.genId(),
            name: name.trim(),
            date: ts,
            createdAt: Date.now()
        });
        this.app.storage.save();
        this.render();
    }

    deleteEvent(id) {
        const events = this.getEvents();
        const idx = events.findIndex(e => e.id === id);
        if (idx === -1) return;
        events.splice(idx, 1);
        this.app.storage.save();
        this.render();
    }

    

    render() {
        if (!this.container) return;

        if (!this.enabled) {
            this.container.replaceChildren();
            return;
        }

        const events = this.getEvents();
        const fragment = document.createDocumentFragment();

        const title = document.createElement('div');
        title.className = 'countdown-title';
        title.textContent = 'Счётчик дней';
        fragment.appendChild(title);

        if (events.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'countdown-empty';
            empty.textContent = 'Пока нет событий';
            fragment.appendChild(empty);
        } else {
            const list = document.createElement('div');
            list.className = 'countdown-list';

            const sorted = [...events].sort((a, b) => a.date - b.date);

            for (const ev of sorted) {
                const days = this.daysUntil(ev.date);
                const isPast = days < 0;
                const absDays = Math.abs(days);
                const dateStr = new Date(ev.date).toLocaleDateString('ru-RU', {
                    day: '2-digit', month: '2-digit', year: 'numeric'
                });

                const item = document.createElement('div');
                item.className = 'countdown-item' + (isPast ? ' past' : '');
                item.dataset.id = ev.id;

                const info = document.createElement('div');
                info.className = 'countdown-item-info';

                const nameEl = document.createElement('div');
                nameEl.className = 'countdown-item-name';
                nameEl.textContent = ev.name;

                const dateEl = document.createElement('div');
                dateEl.className = 'countdown-item-date';
                dateEl.textContent = dateStr;

                info.append(nameEl, dateEl);

                const daysBox = document.createElement('div');
                daysBox.className = 'countdown-item-days';

                const numEl = document.createElement('span');
                numEl.className = 'countdown-days-num';
                numEl.textContent = String(absDays);

                const labelEl = document.createElement('span');
                labelEl.className = 'countdown-days-label';
                labelEl.textContent = isPast ? 'дн. назад' : 'дн.';

                daysBox.append(numEl, labelEl);

                item.append(info, daysBox);

                if (!this.pinned) {
                    const delBtn = document.createElement('button');
                    delBtn.className = 'countdown-delete';
                    delBtn.title = 'Удалить';
                    delBtn.textContent = '✕';
                    delBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.deleteEvent(ev.id);
                    });
                    item.appendChild(delBtn);
                }

                list.appendChild(item);
            }

            fragment.appendChild(list);
        }

        this.container.replaceChildren(fragment);
    }

    

    startTick() {
        if (this.interval) clearInterval(this.interval);

        
        
        this.interval = setInterval(() => {
            if (this.enabled) this.render();
        }, 10 * 60 * 1000);
    }

    daysUntil(timestamp) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const target = new Date(timestamp);
        target.setHours(0, 0, 0, 0);

        return Math.round((target - now) / 86400000);
    }
}

export default Countdown;