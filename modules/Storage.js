class Storage {
    constructor(app) {
        this.app = app;
        this.STORAGE_KEY = 'startV2';
    }

    load() {
        let savedData = {};
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    savedData = parsed;
                }
            }
        } catch (err) {
            console.warn('[Storage] Failed to parse localStorage, using defaults:', err);
        }

        const defaultParticlesSettings = {
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

        const arr = (v) => Array.isArray(v) ? v : [];

        return {
            groups: arr(savedData.groups),
            background: savedData.background || null,
            youtubeId: savedData.youtubeId || null,
            youtubePlaylistId: savedData.youtubePlaylistId || null,
            isMuted: true, // при каждой загрузке звук выключен (не читаем из localStorage)
            volume: savedData.volume ?? 50,
            searchEngine: savedData.searchEngine || 'yandex',
            searchHistory: arr(savedData.searchHistory),
            historyEnabled: savedData.historyEnabled ?? true,
            calculatorEnabled: savedData.calculatorEnabled ?? true,
            translatorEnabled: savedData.translatorEnabled ?? false,
            randomizerEnabled: savedData.randomizerEnabled ?? false,
            randomizerPos: savedData.randomizerPos ?? null,
            weatherEnabled: savedData.weatherEnabled ?? false,
            weatherPos: savedData.weatherPos ?? null,
            sleepModeEnabled: savedData.sleepModeEnabled ?? true,
            sleepTimeout: savedData.sleepTimeout ?? 15,
            blurEnabled: savedData.blurEnabled ?? true,
            particlesEnabled: savedData.particlesEnabled ?? true,
            videoCurrentTime: savedData.videoCurrentTime || 0,
            replaceTab: savedData.replaceTab ?? true,
            glowEnabled: savedData.glowEnabled ?? true,
            grainEnabled: savedData.grainEnabled ?? false,
            stickyNotesEnabled: savedData.stickyNotesEnabled ?? false,
            stickyNotes: arr(savedData.stickyNotes),
            stickyNotesDefaultColor: savedData.stickyNotesDefaultColor || 'yellow',
            countdownEnabled: savedData.countdownEnabled ?? false,
            countdownEvents: arr(savedData.countdownEvents),
            countdownPinned: savedData.countdownPinned ?? false,
            grainOpacity: Math.min(30, Math.max(0, savedData.grainOpacity ?? 5.5)),

            gameIconsEnabled: savedData.gameIconsEnabled ?? false,
            timeWidgetEnabled: savedData.timeWidgetEnabled ?? false,
            timeWidgetPos: savedData.timeWidgetPos ?? null,
            timeAutoSleepEnabled: savedData.timeAutoSleepEnabled ?? true,
            timeCenterInSleepEnabled: savedData.timeCenterInSleepEnabled ?? true,
            timeCenterInClockEnabled: savedData.timeCenterInClockEnabled ?? false,
            timeWidgetState: savedData.timeWidgetState ?? null,

            groupsLocked: savedData.groupsLocked ?? false,

            hue: savedData.hue ?? 220,
            rgbMode: savedData.rgbMode ?? false,
            brightness: savedData.brightness ?? 60,
            uiOpacity: savedData.uiOpacity ?? 100,

            aimBest: savedData.aimBest ?? null,
            aimGames: savedData.aimGames ?? 0,

            typingBestWpm: savedData.typingBestWpm ?? null,
            typingGames: savedData.typingGames ?? 0,

            achievements: arr(savedData.achievements),
            visitsCount: savedData.visitsCount ?? 0,
            visitStreak: savedData.visitStreak ?? 0,
            lastVisitDate: savedData.lastVisitDate ?? null,
            searchCount: savedData.searchCount ?? 0,
            hueChanges: savedData.hueChanges ?? 0,

            notes: (() => {
                const n = savedData.notes;
                if (Array.isArray(n)) return n;
                if (typeof n === 'string' && n.trim()) {
                    return [{ id: 'legacy_' + Date.now(), text: n, createdAt: Date.now() }];
                }
                return [];
            })(),

            particlesSettings: savedData.particlesSettings || defaultParticlesSettings
        };
    }

    syncParticlesFromState() {
        const p = this.app.particles;
        if (!p) return;
        this.app.data.particlesEnabled = p.enabled;
        this.app.data.particlesSettings = {
            STAR_COUNT: p.STAR_COUNT,
            REPEL_FORCE: p.REPEL_FORCE,
            REPEL_RADIUS: p.REPEL_RADIUS,
            BASE_SPEED: p.BASE_SPEED,
            BOUNCE: p.BOUNCE,
            LINE_DISTANCE: p.LINE_DISTANCE,
            OVERLAP_DISTANCE: p.OVERLAP_DISTANCE,
            PARTICLE_REPEL_FORCE: p.PARTICLE_REPEL_FORCE,
            PARTICLE_REPEL_RADIUS: p.PARTICLE_REPEL_RADIUS
        };
    }

    save() {
        try {
            this.syncParticlesFromState();
            this.app.data.glowEnabled = this.app.glowEnabled;
            // isMuted не пишем в localStorage — при новой загрузке всегда true
            const { isMuted, ...toSave } = this.app.data;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toSave));
        } catch (err) {
            console.error('[Storage] save failed:', err);
        }
    }

    saveBeforeUnload() {
        const video = document.getElementById('bgVideo');
        if (video && video.style.display !== 'none') {
            this.app.data.videoCurrentTime = video.currentTime;
        }
        this.save();
    }

    copyConfig() {
        this.syncParticlesFromState();
        const config = JSON.stringify(this.app.data, null, 2);
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(config)
                .then(() => alert('Конфигурация скопирована в буфер обмена'))
                .catch(() => this.fallbackCopy(config));
        } else {
            this.fallbackCopy(config);
        }
    }

    fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try { document.execCommand('copy'); } catch { /* ignore */ }
        document.body.removeChild(textarea);
        alert('Конфигурация скопирована в буфер обмена');
    }

    pasteConfig() {
        if (!navigator.clipboard?.readText) {
            alert('Буфер обмена недоступен');
            return;
        }
        navigator.clipboard.readText()
            .then(text => this.applyConfig(text))
            .catch(() => alert('Не удалось прочитать буфер обмена'));
    }

    applyConfig(text) {
        let newConfig;
        try {
            newConfig = JSON.parse(text);
            if (!newConfig || typeof newConfig !== 'object' || Array.isArray(newConfig)) {
                throw new Error('not an object');
            }
        } catch (err) {
            console.error('[Storage] applyConfig parse failed:', err);
            alert('Неверный формат конфигурации');
            return;
        }

        try {
            Object.assign(this.app.data, newConfig);

            if (this.app.particles) {
                if (newConfig.particlesSettings) {
                    this.app.particles.updateSettings(newConfig.particlesSettings);
                }
                if (newConfig.particlesEnabled !== undefined) {
                    const wasEnabled = this.app.particles.enabled;
                    this.app.particles.enabled = !!newConfig.particlesEnabled;
                    if (this.app.particles.enabled && !wasEnabled) this.app.particles.startLoop?.();
                    if (!this.app.particles.enabled && wasEnabled) this.app.particles.stopLoop?.();
                    const indicator = document.getElementById('particlesIndicator');
                    if (indicator) indicator.classList.toggle('off', !this.app.particles.enabled);
                }
            }

            this.save();
            this.applyChanges();
            alert('Конфигурация применена');
        } catch (err) {
            console.error('[Storage] applyConfig apply failed:', err);
            alert('Не удалось применить конфигурацию');
        }
    }

    applyChanges() {
        const a = this.app;

        a.background?.apply();
        a.groups?.render();
        a.search?.updateUI();
        a.history?.render();
        a.audio?.updateIcon?.(a.data.volume, a.data.isMuted);
        a.toolPanel?.updateIndicators?.();

        document.body.classList.toggle('glow-enabled', a.data.glowEnabled !== false);
        document.body.classList.toggle('glow-disabled', a.data.glowEnabled === false);
        a.hud?.updateGlowIndicator?.();

        if (a.gameIcons) {
            a.gameIcons.updateVisibility();
            a.gameIcons.updateIndicator();
        }

        if (a.timeWidget) {
            a.timeWidget.updateVisibility();
            a.timeWidget.updateIndicator();
            a.timeWidget.restorePosition?.();
            a.timeWidget.restoreState?.();
        }

        if (a.grain) a.grain.apply();

        if (a.stickyNotes) {
            a.stickyNotes.enabled = a.data.stickyNotesEnabled === true;
            a.stickyNotes.updateVisibility();
            a.stickyNotes.updateIndicator();
            a.stickyNotes.render();
        }

        if (a.notes) {
            a.notes.updateVisibility?.();
            a.notes.updateIndicator?.();
            a.notes.render?.();
        }

        if (a.hud) {
            a.hud.updateAutoSleepIndicator();
            a.hud.updateGroupsLockIndicator();
            a.hud.updateSleepModeIndicator?.();
        }

        if (a.hue) {
            const hue = a.data.hue ?? 220;
            const rgbMode = a.data.rgbMode ?? false;
            const brightness = a.data.brightness ?? 60;
            const uiOpacity = a.data.uiOpacity ?? 100;

            if (a.hue.slider) a.hue.slider.value = hue;
            if (a.hue.brightnessSlider) a.hue.brightnessSlider.value = brightness;
            if (a.hue.opacitySlider) a.hue.opacitySlider.value = uiOpacity;

            a.hue.applyBrightness(brightness);
            a.hue.applyOpacity(uiOpacity);
            a.hue.apply(hue);

            if (rgbMode !== a.hue.rgbMode) {
                a.hue.toggleRgbMode();
            } else {
                a.hue.updateRgbButton();
            }
        }

        a.aim?.updateDropdownBest?.();
        a.typing?.updateDropdownBest?.();
        a.achievements?.updateDropdownCounter?.();

        if (a.weather?.widget) {
            a.weather.widget.classList.toggle('visible', a.data.weatherEnabled);
            if (a.data.weatherEnabled) a.weather.fetch();
        }

        if (a.randomizerWidget) {
            a.randomizerWidget.updateVisibility();
            a.randomizerWidget.updateIndicator();
            a.randomizerWidget.restorePosition?.();
        }

        // Погода/курс/итог — ок
    }

    resetConfig() {
        if (!confirm('Вы уверены, что хотите сбросить все настройки?')) return;

        try {
            localStorage.removeItem(this.STORAGE_KEY);
            this.app.data = this.load();

            if (this.app.particles) {
                if (this.app.data.particlesSettings) {
                    this.app.particles.updateSettings(this.app.data.particlesSettings);
                }
                const enabled = this.app.data.particlesEnabled;
                const wasEnabled = this.app.particles.enabled;
                this.app.particles.enabled = !!enabled;

                if (this.app.particles.enabled && !wasEnabled) this.app.particles.startLoop?.();
                if (!this.app.particles.enabled && wasEnabled) this.app.particles.stopLoop?.();

                const indicator = document.getElementById('particlesIndicator');
                if (indicator) indicator.classList.toggle('off', !this.app.particles.enabled);
            }

            this.applyChanges();

            if (this.app.weather?.widget) {
                this.app.weather.widget.classList.remove('visible');
            }

            alert('Конфигурация сброшена');
        } catch (err) {
            console.error('[Storage] resetConfig failed:', err);
            alert('Не удалось сбросить конфигурацию');
        }
    }
}

export default Storage;