import Audio from './modules/Audio.js';
import Particles from './modules/Particles.js';
import Video from './modules/Video.js';
import Storage from './modules/Storage.js';
import HUD from './modules/HUD.js';
import Clock from './modules/Clock.js';
import Weather from './modules/Weather.js';
import Background from './modules/Background.js';
import History from './modules/History.js';
import CalculatorUI from './modules/CalculatorUI.js';
import Search from './modules/Search.js';
import Groups from './modules/Group.js';
import Glow from './modules/Glow.js';
import Hue from './modules/Hue.js';
import Aim from './modules/Aim.js';
import Typing from './modules/Typing.js';
import Achievements from './modules/Achievements.js';
import GameIcons from './modules/GameIcons.js';
import TimeWidget from './modules/TimeWidget.js';
import Notes from './modules/Notes.js';
import Grain from './modules/Grain.js';
import StickyNotes from './modules/StickyNotes.js';
import Countdown from './modules/Countdown.js';
import DropdownSubgroups from './modules/DropdownSubgroups.js';

class App {
    constructor() {
        this.searchEngines = {
            yandex: { name: 'Yandex', url: 'https://yandex.ru/search/?text=' },
            google: { name: 'Google', url: 'https://www.google.com/search?q=' }
        };

        this.storage = new Storage(this);
        this.data = this.storage.load();

        this.hud = new HUD(this);
        this.clock = new Clock(this);
        this.video = new Video(this);
        this.audio = new Audio(this);
        this.weather = new Weather(this);
        this.history = new History(this);
        this.calculatorUI = new CalculatorUI(this);
        this.search = new Search(this);
        this.groups = new Groups(this);
        this.background = new Background(this);
        this.particles = new Particles(this.data.particlesSettings);
        this.glow = new Glow(this);
        this.hue = new Hue(this);
        this.aim = new Aim(this);
        this.typing = new Typing(this);
        this.achievements = new Achievements(this);
        this.gameIcons = new GameIcons(this);
        this.timeWidget = new TimeWidget(this);
        this.notes = new Notes(this);
        this.grain = new Grain(this);
        this.stickyNotes = new StickyNotes(this);
        this.countdown = new Countdown(this);

        this.dropdownSubgroups = new DropdownSubgroups(this);

        this.glowEnabled = this.data.glowEnabled !== false;
        document.body.classList.toggle('glow-enabled', this.glowEnabled);
        document.body.classList.toggle('glow-disabled', !this.glowEnabled);

        window.app = this;
        this.init();
    }

    init() {
        this.hud.init();
        this.clock.init();
        this.audio.init();
        this.weather.init();
        this.history.init();
        this.calculatorUI.init();
        this.search.updateUI();
        this.background.init?.();
        this.background.apply();
        this.groups.render();

        
        if (this.data.particlesEnabled === false) {
            this.particles.enabled = false;
            this.particles.stopLoop?.();
            const indicator = document.getElementById('particlesIndicator');
            if (indicator) indicator.classList.add('off');
            document.body.classList.remove('particles-enabled');
        } else {
            this.particles.enabled = true;
            document.body.classList.add('particles-enabled');
        }

        this.glow.randomize();
        this.hue.init();
        this.aim.init();
        this.aim.updateDropdownBest();
        this.typing.init();
        this.typing.updateDropdownBest();
        this.achievements.init();
        this.gameIcons.init();
        this.timeWidget.init();
        this.notes.init();
        this.grain.init();
        this.stickyNotes.init();
        this.countdown.init();

        this.dropdownSubgroups.init();

        this.search.loadReplaceTab();
    }
}

let app;
try {
    app = new App();
} catch (err) {
    console.error('[App] initialization failed:', err);
}

window.addEventListener('beforeunload', () => {
    try { app?.storage?.saveBeforeUnload?.(); } catch (err) {
        console.error('[App] saveBeforeUnload failed:', err);
    }
});