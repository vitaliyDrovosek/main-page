class Particles {
    constructor(savedSettings = null) {
        this.canvas = document.getElementById('particles');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.enabled = true;
        this.animationFrame = null;
        this.stars = [];
        this.mouseX = -10000;
        this.mouseY = -10000;
        this.mouseActive = false;

        this._initialized = false;
        this._pendingStarCount = null;
        this._starCountRafId = null;

        this.loadSettings(savedSettings);

        
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        this._isMobile = isMobile;
        if (isMobile) {
            if (this.STAR_COUNT > 30) {
                this.STAR_COUNT = Math.max(20, Math.floor(this.STAR_COUNT / 2));
            }
            this.LINE_DISTANCE = Math.min(this.LINE_DISTANCE, 100);
        }

        this.init();
        this.bindEvents();

        
        
        if (this.enabled) document.body.classList.add('particles-enabled');
window.toggleParticlesSettings = () => this.toggleSettings();
        window.resetParticlesSettings  = () => this.resetSettings();
        window.saveParticlesSettings   = () => this.saveSettings();
    }

    loadSettings(savedSettings) {
        const defaults = {
            STAR_COUNT: 50,
            REPEL_FORCE: 0.3,
            REPEL_RADIUS: 200,
            BASE_SPEED: 0.15,
            BOUNCE: 0.2,
            LINE_DISTANCE: 150,
            OVERLAP_DISTANCE: 5,
            PARTICLE_REPEL_FORCE: 0.01,
            PARTICLE_REPEL_RADIUS: 60
        };
        const merged = { ...defaults, ...(savedSettings || {}) };

        
        const num = (v, def) => Number.isFinite(Number(v)) ? Number(v) : def;

        this.STAR_COUNT              = Math.max(10, Math.min(1000, num(merged.STAR_COUNT, 50)));
        this.REPEL_FORCE             = Math.max(0, num(merged.REPEL_FORCE, 0.3));
        this.REPEL_RADIUS            = Math.max(10, num(merged.REPEL_RADIUS, 200));
        this.BASE_SPEED              = Math.max(0, num(merged.BASE_SPEED, 0.15));
        this.BOUNCE                  = Math.max(0, Math.min(1, num(merged.BOUNCE, 0.2)));
        this.LINE_DISTANCE           = Math.max(0, num(merged.LINE_DISTANCE, 150));
        this.OVERLAP_DISTANCE        = Math.max(0, num(merged.OVERLAP_DISTANCE, 5));
        this.PARTICLE_REPEL_FORCE    = Math.max(0, num(merged.PARTICLE_REPEL_FORCE, 0.01));
        this.PARTICLE_REPEL_RADIUS   = Math.max(0, num(merged.PARTICLE_REPEL_RADIUS, 60));
    }

    init() {
        if (!this.canvas) return;
        this.resize();
        this.stars = Array.from({ length: this.STAR_COUNT }, () =>
            this.createStar(
                Math.random() * this.canvas.width,
                Math.random() * this.canvas.height
            )
        );
    }

    createStar(x, y) {
        return {
            x, y,
            vx: (Math.random() - 0.5) * this.BASE_SPEED * 1.2,
            vy: (Math.random() - 0.5) * this.BASE_SPEED * 1.2,
            size: 1.5 + Math.random() * 3.0,
            opacity: 0.4 + Math.random() * 0.6
        };
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());

        document.addEventListener('mousemove', (e) => {
            if (!this.enabled) return;
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.mouseX = (e.clientX - rect.left) * scaleX;
            this.mouseY = (e.clientY - rect.top) * scaleY;
            this.mouseActive = true;
        }, { passive: true });

        document.addEventListener('mouseleave', () => {
            this.mouseActive = false;
        });

        document.addEventListener('touchmove', (e) => {
            if (!this.enabled || !e.touches.length) return;
            const target = e.target;
            const scrollable = target.closest(
                '.dropdown-menu, .search-history, .particles-settings-content, ' +
                '.achievements-modal, .tw-laps, .aim-overlay, .typing-field, .groups'
            );
            if (!scrollable) e.preventDefault();

            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;

            this.mouseX = (e.touches[0].clientX - rect.left) * scaleX;
            this.mouseY = (e.touches[0].clientY - rect.top) * scaleY;
            this.mouseActive = true;
        }, { passive: false });

        document.addEventListener('touchend', () => {
            this.mouseActive = false;
        });
    }

    resize() {
        if (!this.canvas) return;
        const prevW = this.canvas.width;
        const prevH = this.canvas.height;

        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        
        if (prevW > 0 && prevH > 0 && this.stars.length) {
            const sx = this.canvas.width / prevW;
            const sy = this.canvas.height / prevH;
            for (const s of this.stars) {
                s.x *= sx;
                s.y *= sy;
            }
        }
    }

    

    update() {
        if (!this.enabled) return;

        const W = this.canvas.width;
        const H = this.canvas.height;

        for (let i = 0; i < this.stars.length; i++) {
            const s = this.stars[i];

            s.x += s.vx;
            s.y += s.vy;

            s.vx *= 0.998;
            s.vy *= 0.998;

            if (this.mouseActive && this.REPEL_FORCE > 0) {
                const dx = s.x - this.mouseX;
                const dy = s.y - this.mouseY;
                const distSq = dx * dx + dy * dy;
                const rSq = this.REPEL_RADIUS * this.REPEL_RADIUS;

                if (distSq < rSq && distSq > 0) {
                    const dist = Math.sqrt(distSq);
                    const force = this.REPEL_FORCE * (1 - dist / this.REPEL_RADIUS) * 0.1;
                    s.vx += dx * force;
                    s.vy += dy * force;
                }
            }

            if (s.x < 0)              { s.x = 0; s.vx *= -this.BOUNCE; }
            else if (s.x > W)         { s.x = W; s.vx *= -this.BOUNCE; }

            if (s.y < 0)              { s.y = 0; s.vy *= -this.BOUNCE; }
            else if (s.y > H)         { s.y = H; s.vy *= -this.BOUNCE; }

            if (Math.random() < 0.005) {
                s.vx += (Math.random() - 0.5) * 0.05;
                s.vy += (Math.random() - 0.5) * 0.05;
            }
        }

        if (this.PARTICLE_REPEL_FORCE > 0) this.repelParticles();
    }

    repelParticles() {
        const count = this.stars.length;
        const rSq = this.PARTICLE_REPEL_RADIUS * this.PARTICLE_REPEL_RADIUS;
        const forceK = this.PARTICLE_REPEL_FORCE;

        for (let i = 0; i < count; i++) {
            const s1 = this.stars[i];
            for (let j = i + 1; j < count; j++) {
                const s2 = this.stars[j];
                const dx = s1.x - s2.x;
                const dy = s1.y - s2.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < rSq && distSq > 0) {
                    const dist = Math.sqrt(distSq);
                    const force = forceK * (1 - dist / this.PARTICLE_REPEL_RADIUS);
                    const nx = dx / dist;
                    const ny = dy / dist;
                    s1.vx += nx * force;
                    s1.vy += ny * force;
                    s2.vx -= nx * force;
                    s2.vy -= ny * force;
                }
            }
        }
    }

    

    draw() {
        if (!this.ctx || !this.canvas) return;

        const W = this.canvas.width;
        const H = this.canvas.height;
        const ctx = this.ctx;
        const stars = this.stars;

        ctx.clearRect(0, 0, W, H);

        
        if (this.LINE_DISTANCE > 0 && this.OVERLAP_DISTANCE < this.LINE_DISTANCE) {
            const lineDist = this.LINE_DISTANCE;
            const overlapDist = this.OVERLAP_DISTANCE;
            const distSqMax = lineDist * lineDist;
            const distSqMin = overlapDist * overlapDist;
            const baseOpacity = 0.3;

            ctx.lineWidth = 1;

            
            const buckets = new Map(); 

            for (let i = 0; i < stars.length; i++) {
                const s1 = stars[i];
                for (let j = i + 1; j < stars.length; j++) {
                    const s2 = stars[j];
                    const dx = s1.x - s2.x;
                    const dy = s1.y - s2.y;
                    const distSq = dx * dx + dy * dy;

                    if (distSq < distSqMax && distSq > distSqMin) {
                        const dist = Math.sqrt(distSq);
                        const alpha = baseOpacity * (1 - dist / lineDist);
                        
                        const key = Math.round(alpha * 50) / 50;
                        let arr = buckets.get(key);
                        if (!arr) { arr = []; buckets.set(key, arr); }
                        arr.push(s1.x, s1.y, s2.x, s2.y);
                    }
                }
            }

            for (const [alpha, coords] of buckets) {
                ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
                ctx.beginPath();
                for (let k = 0; k < coords.length; k += 4) {
                    ctx.moveTo(coords[k],     coords[k + 1]);
                    ctx.lineTo(coords[k + 2], coords[k + 3]);
                }
                ctx.stroke();
            }
        }

        
        const useShadow = stars.length < 120;
        if (useShadow) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#3b82f6';
        } else {
            ctx.shadowBlur = 0;
        }

        for (const s of stars) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * 0.7, 0, 2 * Math.PI);
            ctx.fillStyle = `rgba(59, 130, 246, ${s.opacity})`;
            ctx.fill();
        }

        if (useShadow) ctx.shadowBlur = 0;
    }

    

    animate() {
        if (!this.enabled) {
            this.animationFrame = null;
            return;
        }

        this.update();
        this.draw();

        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    startLoop() {
        if (this.animationFrame) return;
        this.canvas.style.display = 'block';
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    stopLoop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        this.canvas.style.display = 'none';
    }

    

    toggle() {
        this.enabled = !this.enabled;

        const indicator = document.getElementById('particlesIndicator');
        if (indicator) indicator.classList.toggle('off', !this.enabled);

        
        document.body.classList.toggle('particles-enabled', this.enabled);

        if (this.enabled) {
            if (this.stars.length === 0) {
                this.init();
            } else if (this.canvas.width === 0 || this.canvas.height === 0) {
                this.resize();
            }
            this.startLoop();
        } else {
            this.stopLoop();

            
            const panel = document.getElementById('particlesSettingsPanel');
            if (panel && panel.classList.contains('visible')) {
                this.toggleSettings();
            }
        }

        if (window.app) window.app.storage.save();

    }

    

    updateSetting(setting, value) {
        this[setting] = value;

        if (setting === 'STAR_COUNT') {
            
            this._pendingStarCount = value;
            if (!this._starCountRafId) {
                this._starCountRafId = requestAnimationFrame(() => {
                    this._starCountRafId = null;
                    if (this._pendingStarCount !== null) {
                        this.STAR_COUNT = this._pendingStarCount;
                        this._pendingStarCount = null;
                        this.init();
                    }
                });
            }
        }

        const settingId = setting.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        const valueSpan = document.getElementById(settingId + 'Value');
        if (valueSpan) valueSpan.textContent = value;
    }

    updateSettings(settings) {
        const changed = settings.STAR_COUNT !== undefined && settings.STAR_COUNT !== this.STAR_COUNT;
        Object.assign(this, settings);
        if (changed) this.init();
        if (window.app?.data) {
            window.app.data.particlesSettings = { ...settings };
        }
    }

    toggleSettings() {
        const panel = document.getElementById('particlesSettingsPanel');
        const dropdownMenu = document.getElementById('dropdownMenu');
        const backdrop = document.getElementById('particlesSettingsBackdrop');
        if (!panel || !dropdownMenu) return;

        const willOpen = !panel.classList.contains('visible');

        if (willOpen) {
            
            panel._originalParent = panel.parentNode;
            panel._originalNext = panel.nextSibling;
            document.body.appendChild(panel);

            
            panel.classList.add('visible');
            dropdownMenu.classList.add('panel-open');

            
            if (backdrop) {
                backdrop.classList.add('visible');
                backdrop._onClick = () => this.toggleSettings();
                backdrop.addEventListener('click', backdrop._onClick);
            }

            
            this.setupSettingsListeners();
            this.updateSettingsPanel();

            
            setTimeout(() => {
                document.addEventListener('click', this.closeSettingsHandler);
            }, 100);
        } else {
            
            panel.classList.remove('visible');
            dropdownMenu.classList.remove('panel-open');
            this.removeSettingsListeners();
            document.removeEventListener('click', this.closeSettingsHandler);

            if (backdrop) {
                backdrop.classList.remove('visible');
                if (backdrop._onClick) {
                    backdrop.removeEventListener('click', backdrop._onClick);
                    backdrop._onClick = null;
                }
            }

            
            if (panel._originalParent) {
                if (panel._originalNext && panel._originalNext.parentNode === panel._originalParent) {
                    panel._originalParent.insertBefore(panel, panel._originalNext);
                } else {
                    panel._originalParent.appendChild(panel);
                }
                panel._originalParent = null;
                panel._originalNext = null;
            }
        }

    }

    setupSettingsListeners() {
        const settings = [
            { id: 'starCount', setting: 'STAR_COUNT', type: 'int' },
            { id: 'repelForce', setting: 'REPEL_FORCE', type: 'float' },
            { id: 'repelRadius', setting: 'REPEL_RADIUS', type: 'int' },
            { id: 'baseSpeed', setting: 'BASE_SPEED', type: 'float' },
            { id: 'bounce', setting: 'BOUNCE', type: 'float' },
            { id: 'lineDistance', setting: 'LINE_DISTANCE', type: 'int' },
            { id: 'overlapDistance', setting: 'OVERLAP_DISTANCE', type: 'int' },
            { id: 'particleRepelForce', setting: 'PARTICLE_REPEL_FORCE', type: 'float' },
            { id: 'particleRepelRadius', setting: 'PARTICLE_REPEL_RADIUS', type: 'int' }
        ];

        for (const { id, setting, type } of settings) {
            const input = document.getElementById(id);
            if (!input) continue;

            const handler = (e) => {
                const value = type === 'int' ? parseInt(e.target.value, 10) : parseFloat(e.target.value);
                if (!Number.isFinite(value)) return;

                const formattedValue = type === 'float' && id.includes('Force') && id !== 'repelForce'
                    ? value.toFixed(3)
                    : type === 'float' ? value.toFixed(2) : value;

                const span = document.getElementById(id + 'Value');
                if (span) span.textContent = formattedValue;
                this.updateSetting(setting, value);
            };

            input.addEventListener('input', handler);
            input._handler = handler;
        }
    }

    removeSettingsListeners() {
        const ids = [
            'starCount', 'repelForce', 'repelRadius', 'baseSpeed',
            'bounce', 'lineDistance', 'overlapDistance',
            'particleRepelForce', 'particleRepelRadius'
        ];
        for (const id of ids) {
            const input = document.getElementById(id);
            if (input && input._handler) {
                input.removeEventListener('input', input._handler);
                delete input._handler;
            }
        }
    }

    closeSettingsHandler = (e) => {
        const panel = document.getElementById('particlesSettingsPanel');
        const dropdownMenu = document.getElementById('dropdownMenu');
        const settingsButton = document.querySelector('.dropdown-item[onclick="toggleParticlesSettings()"]');

        if (settingsButton?.contains(e.target)) return;

        if (panel?.classList.contains('visible') &&
            !panel.contains(e.target) &&
            dropdownMenu?.classList.contains('show') &&
            !dropdownMenu.contains(e.target)) {
            panel.classList.remove('visible');
            dropdownMenu.classList.remove('panel-open');
            this.removeSettingsListeners();
            document.removeEventListener('click', this.closeSettingsHandler);
        }
    };

    updateSettingsPanel() {
        const settings = [
            { id: 'starCount', value: this.STAR_COUNT },
            { id: 'repelForce', value: this.REPEL_FORCE, format: (v) => v.toFixed(2) },
            { id: 'repelRadius', value: this.REPEL_RADIUS },
            { id: 'baseSpeed', value: this.BASE_SPEED, format: (v) => v.toFixed(2) },
            { id: 'bounce', value: this.BOUNCE, format: (v) => v.toFixed(2) },
            { id: 'lineDistance', value: this.LINE_DISTANCE },
            { id: 'overlapDistance', value: this.OVERLAP_DISTANCE },
            { id: 'particleRepelForce', value: this.PARTICLE_REPEL_FORCE, format: (v) => v.toFixed(3) },
            { id: 'particleRepelRadius', value: this.PARTICLE_REPEL_RADIUS }
        ];

        for (const { id, value, format } of settings) {
            const input = document.getElementById(id);
            const span  = document.getElementById(id + 'Value');
            if (input) input.value = value;
            if (span) span.textContent = format ? format(value) : value;
        }
    }

    resetSettings() {
        const defaults = {
            STAR_COUNT: 50,
            REPEL_FORCE: 0.3,
            REPEL_RADIUS: 200,
            BASE_SPEED: 0.15,
            BOUNCE: 0.2,
            LINE_DISTANCE: 150,
            OVERLAP_DISTANCE: 5,
            PARTICLE_REPEL_FORCE: 0.01,
            PARTICLE_REPEL_RADIUS: 60
        };
        Object.assign(this, defaults);
        this.init();
        this.updateSettingsPanel();
        if (window.app?.data) {
            window.app.data.particlesSettings = { ...defaults };
        }
    }

    saveSettings() {
        if (window.app) window.app.storage.save();
        this.toggleSettings();

    }
}

export default Particles;