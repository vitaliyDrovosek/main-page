class Achievements {
    constructor(app) {
        this.app = app;
        this.queue = [];
        this.showing = false;
        this.toastEl = null;
        this.modalEl = null;
        this.boundModalKey = null;

        
        this._audioCtx = null;

        
        this.TOAST_DURATION = 5000;
        this.TOAST_GAP = 400;

        this._initialized = false;

        this.LIST = {
            first_visit:      { title: 'Первый шаг',            desc: 'Открыл стартпейдж впервые' },
            ten_visits:       { title: 'Постоянный гость',      desc: 'Зашёл 10 раз' },
            hundred_visits:   { title: 'Завсегдатай',           desc: 'Зашёл 100 раз' },
            week_streak:      { title: 'Верный пользователь',   desc: 'Заходил 7 дней подряд' },

            first_palette:    { title: 'Стилист',               desc: 'Поменял оттенок сайта' },
            rgb_master:       { title: 'Радужный',              desc: 'Включил RGB-режим' },
            customizer:       { title: 'Коллекционер тем',      desc: 'Сохранил 5 палитр' },
            glow_off:         { title: 'Минималист',            desc: 'Выключил glow-эффект' },

            first_search:     { title: 'Первый поиск',          desc: 'Что-то нашёл через стартпейдж' },
            ten_searches:     { title: 'Искатель',              desc: '10 поисков' },
            hundred_searches: { title: 'Охотник',               desc: '100 поисков' },

            aim_first:        { title: 'Первая партия',         desc: 'Сыграл в Aim Trainer' },
            aim_10:           { title: 'Меткий',                desc: '10 партий в Aim Trainer' },
            aim_under_half:   { title: 'Снайпер',               desc: 'Среднее время меньше 0.5с' },
            aim_perfect:      { title: 'Без промаха',           desc: 'Партия в Aim Trainer без промахов' },

            typing_first:     { title: 'Первое слово',          desc: 'Сыграл в Typing Speed' },
            typing_10:        { title: 'Скоростной',            desc: '10 партий в Typing Speed' },
            typing_40wpm:     { title: 'Ловкие пальцы',         desc: '40+ WPM' },
            typing_60wpm:     { title: 'Клавиатурный ниндзя',   desc: '60+ WPM' },
            typing_90acc:     { title: 'Снайпер клавиатуры',    desc: '90%+ точности в Typing Speed' },

            night_owl:        { title: 'Полуночник',            desc: 'Зашёл после 3:00' },
            early_bird:       { title: 'Ранняя пташка',         desc: 'Зашёл до 6:00' },

            all_achievements: { title: 'Одержимый',             desc: 'Собрал все достижения' }
        };
    }

    init() {
        if (this._initialized) return;
        this._initialized = true;

        this.toastEl = document.getElementById('achievementToast');
        this.modalEl = document.getElementById('achievementsModal');

        document.getElementById('achievementsOpenBtn')?.addEventListener('click', () => this.openModal());
        document.getElementById('achievementsCloseBtn')?.addEventListener('click', () => this.closeModal());

        this.trackVisit();
        this.checkTimeOfDay();
        this.updateDropdownCounter();
    }

    

    getUnlocked() {
        if (!Array.isArray(this.app.data.achievements)) {
            this.app.data.achievements = [];
        }
        return this.app.data.achievements;
    }

    isUnlocked(id) {
        return this.getUnlocked().includes(id);
    }

    save() {
        this.app.storage?.save();
    }

    

    unlock(id) {
        if (!this.LIST[id]) return;
        if (this.isUnlocked(id)) return;

        this.getUnlocked().push(id);
        this.save();
        this.enqueue(id);
        this.updateDropdownCounter();

        
        if (id !== 'all_achievements') {
            const totalExcludingSelf = Object.keys(this.LIST).length - 1;
            if (this.getUnlocked().length >= totalExcludingSelf) {
                this.unlock('all_achievements');
            }
        }
    }

    

    trackVisit() {
        const data = this.app.data;
        const today = new Date().toDateString();
        const last = data.lastVisitDate;
        let changed = false;

        
        if (!data.visitsCount) {
            data.visitsCount = 1;
            this.unlock('first_visit');
            changed = true;
        }

        
        if (last !== today) {
            const yesterday = new Date(Date.now() - 86400000).toDateString();

            data.visitStreak = last === yesterday
                ? (data.visitStreak || 0) + 1
                : 1;

            data.lastVisitDate = today;
            data.visitsCount = (data.visitsCount || 0) + 1;
            changed = true;

            if (data.visitsCount >= 10)  this.unlock('ten_visits');
            if (data.visitsCount >= 100) this.unlock('hundred_visits');
            if (data.visitStreak >= 7)   this.unlock('week_streak');
        }

        
        if (changed) this.save();
    }

    checkTimeOfDay() {
        const hour = new Date().getHours();
        if (hour >= 3 && hour < 6) this.unlock('night_owl');
        if (hour >= 4 && hour < 6) this.unlock('early_bird');
    }

    trackSearch() {
        const data = this.app.data;
        data.searchCount = (data.searchCount || 0) + 1;
        if (data.searchCount === 1)   this.unlock('first_search');
        if (data.searchCount >= 10)   this.unlock('ten_searches');
        if (data.searchCount >= 100)  this.unlock('hundred_searches');
        
        
        this.save();
    }

    trackHueChange() {
        const data = this.app.data;
        data.hueChanges = (data.hueChanges || 0) + 1;
        if (data.hueChanges >= 1) this.unlock('first_palette');
        
    }

    trackRgbMode() {
        if (this.app.data.rgbMode) this.unlock('rgb_master');
    }

    trackGlowOff(enabled) {
        if (!enabled) this.unlock('glow_off');
    }

    trackAimGame(stats) {
        const data = this.app.data;
        data.aimGames = (data.aimGames || 0) + 1;
        if (data.aimGames === 1)              this.unlock('aim_first');
        if (data.aimGames >= 10)              this.unlock('aim_10');
        if (stats.avgWithPenalty < 0.5)       this.unlock('aim_under_half');
        if (stats.misses === 0)               this.unlock('aim_perfect');
        
    }

    trackTypingGame(stats) {
        const data = this.app.data;
        data.typingGames = (data.typingGames || 0) + 1;
        if (data.typingGames === 1)  this.unlock('typing_first');
        if (data.typingGames >= 10)  this.unlock('typing_10');
        if (stats.wpm >= 40)         this.unlock('typing_40wpm');
        if (stats.wpm >= 60)         this.unlock('typing_60wpm');
        if (stats.accuracy >= 90)    this.unlock('typing_90acc');
    }

    

    enqueue(id) {
        this.queue.push(id);
        if (!this.showing) this.showNext();
    }

    showNext() {
        if (this.queue.length === 0) {
            this.showing = false;
            return;
        }

        this.showing = true;
        const id = this.queue.shift();
        const data = this.LIST[id];

        if (!this.toastEl) {
            this.showNext();
            return;
        }

        const titleEl = this.toastEl.querySelector('.achievement-toast-title');
        const descEl  = this.toastEl.querySelector('.achievement-toast-desc');

        if (titleEl) titleEl.textContent = data.title;
        if (descEl)  descEl.textContent  = data.desc;

        this.toastEl.classList.add('visible');
        this.playSound();

        const progress = this.toastEl.querySelector('.achievement-toast-progress');
        if (progress) {
            progress.style.transition = 'none';
            progress.style.width = '100%';
            void progress.offsetWidth;
            progress.style.transition = `width ${this.TOAST_DURATION}ms linear`;
            progress.style.width = '0%';
        }

        setTimeout(() => {
            this.toastEl.classList.remove('visible');
            setTimeout(() => this.showNext(), this.TOAST_GAP);
        }, this.TOAST_DURATION);
    }

    

    getAudioContext() {
        if (this._audioCtx) return this._audioCtx;
        try {
            this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch {
            this._audioCtx = null;
        }
        return this._audioCtx;
    }

    playSound() {
        const ctx = this.getAudioContext();
        if (!ctx) return;

        
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }

        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(660, ctx.currentTime);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);

            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.4);
        } catch {
            
        }
    }

    

    openModal() {
        if (!this.modalEl) return;
        this.renderModal();
        this.modalEl.classList.add('visible');

        if (this.boundModalKey) {
            document.removeEventListener('keydown', this.boundModalKey);
        }
        this.boundModalKey = (e) => {
            if (e.key === 'Escape') this.closeModal();
        };
        document.addEventListener('keydown', this.boundModalKey);
    }

    closeModal() {
        if (!this.modalEl) return;
        this.modalEl.classList.remove('visible');
        if (this.boundModalKey) {
            document.removeEventListener('keydown', this.boundModalKey);
            this.boundModalKey = null;
        }
    }

    renderModal() {
        if (!this.modalEl) return;
        const grid    = this.modalEl.querySelector('.achievements-grid');
        const counter = this.modalEl.querySelector('.achievements-counter');
        if (!grid) return;

        const unlockedSet = new Set(this.getUnlocked());
        const total = Object.keys(this.LIST).length;

        if (counter) counter.textContent = `${unlockedSet.size} / ${total}`;

        
        const fragment = document.createDocumentFragment();

        for (const [id, data] of Object.entries(this.LIST)) {
            const isUnlocked = unlockedSet.has(id);

            const card = document.createElement('div');
            card.className = 'achievement-card ' + (isUnlocked ? 'unlocked' : 'locked');

            const title = document.createElement('div');
            title.className = 'achievement-card-title';
            title.textContent = data.title;

            const desc = document.createElement('div');
            desc.className = 'achievement-card-desc';
            desc.textContent = data.desc;

            const status = document.createElement('div');
            status.className = 'achievement-card-status';
            status.textContent = isUnlocked ? 'Получено' : 'Заблокировано';

            card.append(title, desc, status);
            fragment.appendChild(card);
        }

        grid.replaceChildren(fragment);
    }

    updateDropdownCounter() {
        const el = document.getElementById('achievementsCounter');
        if (!el) return;
        const unlocked = this.getUnlocked().length;
        const total = Object.keys(this.LIST).length;
        el.textContent = `${unlocked} / ${total}`;
    }
}

export default Achievements;