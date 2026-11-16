class GameIcons {
    constructor(app) {
        this.app = app;
        this.panel = null;
        this._initialized = false;
    }

    _isEnabled() {
        return this.app.data.gameIconsEnabled === true;
    }

    init() {
        this.panel = document.getElementById('gameIcons');
        if (!this.panel) return;

        
        if (this._initialized) {
            this.updateVisibility();
            this.updateIndicator();
            return;
        }
        this._initialized = true;

        this.updateVisibility();
        this.updateIndicator(); 

        document.getElementById('gameIconAim')
            ?.addEventListener('click', () => this.app.aim?.open());
        document.getElementById('gameIconTyping')
            ?.addEventListener('click', () => this.app.typing?.open());
        document.getElementById('gameIconCasino')
            ?.addEventListener('click', () => this.app.casino?.open());
    }

    updateVisibility() {
        if (!this.panel) return;
        this.panel.classList.toggle('visible', this._isEnabled());
    }

    toggle() {
        this.app.data.gameIconsEnabled = !this._isEnabled();
        this.updateVisibility();
        this.updateIndicator();
        this.app.storage.save();
    }

    updateIndicator() {
        const indicator = document.getElementById('gameIconsIndicator');
        if (indicator) indicator.classList.toggle('off', !this._isEnabled());
    }
}

export default GameIcons;