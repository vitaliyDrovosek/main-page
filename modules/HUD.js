class HUD {
    constructor(app) {
        this.app = app;
        this.timer = null;
        this.TIMEOUT = 15000;

        this._sleepTimeoutSlider = null;
        this._sleepTimeoutValueEl = null;

        this.tabVisible = true;
        this._initialized = false;

        
        this._lastMouseX = 0;
        this._lastMouseY = 0;
        this._lastTouchX = 0;
        this._lastTouchY = 0;
        this._moveRafId = null;

        

        this.boundHandlers = this.createBoundHandlers();
    }

    createBoundHandlers() {
        return {
            handleMouseMove: this.handleMouseMove.bind(this),
            handleMouseDown: this.handleActivity.bind(this),
            handleKeyDown: this.handleKeyDown.bind(this),
            handleTouchMove: this.handleTouchMove.bind(this),
            handleWheel: this.handleActivity.bind(this),
            handleVisibilityChange: this.handleVisibilityChange.bind(this),
            handleWindowBlur: this.handleWindowBlur.bind(this),
            handleWindowFocus: this.handleWindowFocus.bind(this)
        };
    }

    init() {
        if (this._initialized) return;
        this._initialized = true;

        const h = this.boundHandlers;

        document.addEventListener('mousemove', h.handleMouseMove, { passive: true });
        document.addEventListener('mousedown', h.handleMouseDown, { passive: true });
        document.addEventListener('keydown', h.handleKeyDown);
        document.addEventListener('touchmove', h.handleTouchMove, { passive: false });
        document.addEventListener('touchstart', h.handleMouseDown, { passive: true });
        document.addEventListener('wheel', h.handleWheel, { passive: true });
        document.addEventListener('visibilitychange', h.handleVisibilityChange);
        window.addEventListener('blur', h.handleWindowBlur);
        window.addEventListener('focus', h.handleWindowFocus);

        
        let _downInside = false;
        document.addEventListener('mousedown', (e) => {
            const menu = document.getElementById('dropdownMenu');
            if (!menu || !menu.classList.contains('show')) return;
            _downInside = !!(e.target.closest && (
                e.target.closest('#dropdownMenu') ||
                e.target.closest('.dropdown-button') ||
                e.target.closest('#particlesSettingsPanel')
            ));
        }, true);

        document.addEventListener('mouseup', (e) => {
            const menu = document.getElementById('dropdownMenu');
            if (!menu || !menu.classList.contains('show')) return;

            
            const particlesPanel = document.getElementById('particlesSettingsPanel');
            if (particlesPanel && particlesPanel.classList.contains('visible')) {
                
                const insideMenu = !!(e.target.closest && e.target.closest('#dropdownMenu'));
                if (!insideMenu) return;
            }

            const upInside = !!(e.target.closest && (
                e.target.closest('#dropdownMenu') ||
                e.target.closest('.dropdown-button') ||
                e.target.closest('#particlesSettingsPanel')
            ));
            if (!_downInside && !upInside) {
                this.hideDropdown();
            }
        }, true);

        
        this._sleepTimeoutSlider = document.getElementById('sleepTimeout');
        this._sleepTimeoutValueEl = document.getElementById('sleepTimeoutValue');
        if (this._sleepTimeoutSlider) {
            const savedSec = Number(this.app.data.sleepTimeout);
            const initialSec = Number.isFinite(savedSec) ? savedSec : Math.round(this.TIMEOUT / 1000);
            this._sleepTimeoutSlider.value = initialSec;
            if (this._sleepTimeoutValueEl) this._sleepTimeoutValueEl.textContent = initialSec;
            this.TIMEOUT = initialSec * 1000;

            this._sleepTimeoutSlider.addEventListener('input', (e) => {
                const sec = parseInt(e.target.value, 10) || 15;
                this.TIMEOUT = sec * 1000;
                if (this._sleepTimeoutValueEl) this._sleepTimeoutValueEl.textContent = sec;
                this.resetTimer();
            });
            this._sleepTimeoutSlider.addEventListener('change', () => {
                this.app.data.sleepTimeout = this.TIMEOUT / 1000;
                this.app.storage.save();
            });
        }

        this.updateSleepModeIndicator();
        this.updateAutoSleepIndicator();
        this.updateGroupsLockIndicator();
        this.updateGlowIndicator();
        this.updateBlurIndicator();
    }

    

    _scheduleActivity() {
        if (this._moveRafId) return;
        this._moveRafId = requestAnimationFrame(() => {
            this._moveRafId = null;
            this.handleActivity();
        });
    }

    handleMouseMove(e) {
        if (!this.tabVisible) return;
        if (this._lastMouseX && this._lastMouseY) {
            const dx = Math.abs(e.clientX - this._lastMouseX);
            const dy = Math.abs(e.clientY - this._lastMouseY);
            if (dx > 5 || dy > 5) this._scheduleActivity();
        }
        this._lastMouseX = e.clientX;
        this._lastMouseY = e.clientY;
    }

    handleKeyDown(e) {
        if (!this.tabVisible) return;
        const functionalKeys = ['F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'];
        if (!e.ctrlKey && !e.altKey && !e.metaKey && !functionalKeys.includes(e.key)) {
            this.handleActivity();
        }
    }

    handleTouchMove(e) {
        if (!this.tabVisible || !e.touches.length) return;
        const target = e.target;
        const scrollable = target.closest(
            '.dropdown-menu, .search-history, .particles-settings-content, ' +
            '.achievements-modal, .tw-laps, .aim-overlay, .typing-field, .groups'
        );
        if (!scrollable) e.preventDefault();

        const touch = e.touches[0];
        if (this._lastTouchX && this._lastTouchY) {
            const dx = Math.abs(touch.clientX - this._lastTouchX);
            const dy = Math.abs(touch.clientY - this._lastTouchY);
            if (dx > 10 || dy > 10) this._scheduleActivity();
        }
        this._lastTouchX = touch.clientX;
        this._lastTouchY = touch.clientY;
    }

    handleActivity() {
        if (!this.tabVisible) return;
        this.resetTimer();
    }

    handleVisibilityChange() {
        this.tabVisible = !document.hidden;
        if (this.tabVisible) this.resetTimer();
        else this.clearSleepTimer();
    }

    handleWindowBlur() { this.tabVisible = false; }
    handleWindowFocus() { this.tabVisible = true; this.resetTimer(); }

    

    

    show() {
        if (!document.body.classList.contains('hud-hidden')) return;
        document.body.classList.remove('hud-hidden');
        this.app.timeWidget?.hideCenter();
        this.app.timeWidget?.renderSleepTime?.();
    }

    hide() {
        if (!this.tabVisible) return;
        if (!this.app.data.sleepModeEnabled) return;
        if (!this.app.data.timeAutoSleepEnabled && this.app.timeWidget?.isActive()) return;
        document.body.classList.add('hud-hidden');
        this.app.timeWidget?.renderSleepTime?.();
    }

    forceHide() {
        if (!this.tabVisible) return;
        document.body.classList.add('hud-hidden');
        this.app.timeWidget?.renderSleepTime?.();
        this.clearSleepTimer();
    }

    resetTimer() {
        this.show();
        this.clearSleepTimer();
        if (this.app.data.sleepModeEnabled && this.tabVisible) {
            if (!this.app.data.timeAutoSleepEnabled && this.app.timeWidget?.isActive()) return;
            this.timer = setTimeout(() => this.hide(), this.TIMEOUT);
        }
    }

    clearSleepTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    

    toggleSleepMode() {
        this.app.data.sleepModeEnabled = !this.app.data.sleepModeEnabled;
        this.updateSleepModeIndicator();
        if (this.app.data.sleepModeEnabled) this.resetTimer();
        else { this.show(); this.clearSleepTimer(); }
        this.app.storage.save();
    }

    updateSleepModeIndicator() {
        const indicator = document.getElementById('sleepModeIndicator');
        if (indicator) indicator.classList.toggle('off', !this.app.data.sleepModeEnabled);

        const ctrl = document.getElementById('sleepTimeoutControl');
        if (ctrl) ctrl.style.display = this.app.data.sleepModeEnabled ? 'flex' : 'none';
    }

    toggleAutoSleep() {
        this.app.data.timeAutoSleepEnabled = !this.app.data.timeAutoSleepEnabled;
        this.updateAutoSleepIndicator();
        this.app.storage.save();
        this.resetTimer();
    }

    updateAutoSleepIndicator() {
        const indicator = document.getElementById('timeAutoSleepIndicator');
        if (indicator) indicator.classList.toggle('off', !this.app.data.timeAutoSleepEnabled);
    }

    toggleGroupsLock() {
        this.app.data.groupsLocked = !this.app.data.groupsLocked;
        this.updateGroupsLockIndicator();
        this.app.groups.render();
        this.app.storage.save();
    }

    updateGroupsLockIndicator() {
        const indicator = document.getElementById('groupsLockIndicator');
        if (indicator) indicator.classList.toggle('off', !this.app.data.groupsLocked);
    }

    toggleGlow() {
        this.app.glowEnabled = !this.app.glowEnabled;
        document.body.classList.toggle('glow-enabled', this.app.glowEnabled);
        document.body.classList.toggle('glow-disabled', !this.app.glowEnabled);
        this.updateGlowIndicator();
        this.app.storage.save();
        this.app.achievements?.trackGlowOff(this.app.glowEnabled);
    }

    updateGlowIndicator() {
        const indicator = document.getElementById('glowIndicator');
        if (indicator) indicator.classList.toggle('off', !this.app.glowEnabled);
    }

    toggleBlur() {
        this.app.data.blurEnabled = !this.app.data.blurEnabled;
        this.updateBlurIndicator();
        document.body.classList.toggle('blur-enabled', this.app.data.blurEnabled);
        document.body.classList.toggle('blur-disabled', !this.app.data.blurEnabled);
        this.app.storage.save();
    }

    updateBlurIndicator() {
        const indicator = document.getElementById('blurIndicator');
        if (indicator) indicator.classList.toggle('off', !this.app.data.blurEnabled);
    }

    toggleGameIcons() { this.app.gameIcons?.toggle(); }

    

    toggleDropdown() {
        const menu = document.getElementById('dropdownMenu');
        const particlesPanel = document.getElementById('particlesSettingsPanel');
        const overlay = document.getElementById('mobileHudOverlay');
        if (!menu) return;

        if (menu.classList.contains('show') && particlesPanel?.classList.contains('visible')) {
            particlesPanel.classList.remove('visible');
            menu.classList.remove('panel-open');
        }

        menu.classList.toggle('show');

        if (menu.classList.contains('show')) {
            document.body.classList.add('dropdown-open');
            if (overlay) overlay.classList.add('visible');
        } else {
            document.body.classList.remove('dropdown-open');
            menu.classList.remove('panel-open');
            if (overlay) overlay.classList.remove('visible');
        }

        this.resetTimer();
    }

    hideDropdown() {
        const menu = document.getElementById('dropdownMenu');
        const overlay = document.getElementById('mobileHudOverlay');
        if (menu) menu.classList.remove('show');
        document.body.classList.remove('dropdown-open');
        if (overlay) overlay.classList.remove('visible');
    }

    toggleGrain() { this.app.grain?.toggle(); }
}

export default HUD;