class Background {
    constructor(app) {
        this.app = app;
        this.restoringTime = false;

        
        this._img = null;
        this._vid = null;
        this._wrapper = null;

        
        this._lastTimeSave = 0;
        this._timeSaveInterval = 5000; 

        
        this._playAttempts = 0;
        this._maxPlayAttempts = 5;
    }

    init() {
        this._img = document.getElementById('bgImage');
        this._vid = document.getElementById('bgVideo');
        this._wrapper = document.getElementById('youtubeWrapper');
    }

    _getEls() {
        if (!this._img) this._img = document.getElementById('bgImage');
        if (!this._vid) this._vid = document.getElementById('bgVideo');
        if (!this._wrapper) this._wrapper = document.getElementById('youtubeWrapper');
        return { img: this._img, vid: this._vid, wrapper: this._wrapper };
    }

    apply() {
        const { img, vid, wrapper } = this._getEls();
        if (!img || !vid || !wrapper) return;

        
        img.style.display = 'none';
        img.removeAttribute('src');

        vid.style.display = 'none';
        vid.pause();
        vid.removeAttribute('src');
        vid.ontimeupdate = null;
        vid.load();

        wrapper.style.display = 'none';
        wrapper.replaceChildren();

        this._playAttempts = 0;

        
        if (this.app.data.youtubePlaylistId || this.app.data.youtubeId) {
            wrapper.style.display = 'block';

            const iframe = document.createElement('iframe');
            iframe.id = 'bgYoutube';
            iframe.frameBorder = '0';
            iframe.allow = 'autoplay; encrypted-media; accelerometer; gyroscope; picture-in-picture';
            iframe.allowFullscreen = true;
            Object.assign(iframe.style, {
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: '0',
                left: '0',
                pointerEvents: 'none'
            });

            if (this.app.data.youtubePlaylistId) {
                iframe.src = `https://www.youtube.com/embed/videoseries?list=${this.app.data.youtubePlaylistId}&autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&enablejsapi=1`;
            } else {
                iframe.src = `https://www.youtube.com/embed/${this.app.data.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${this.app.data.youtubeId}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&enablejsapi=1`;
            }

            wrapper.appendChild(iframe);
            this.app.video?.startKeepAlive();
            return;
        }

        
        if (!this.app.data.background) return;

        const url = this.app.data.background.toLowerCase();
        const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv)(\?|#|$)/.test(url);

        if (isVideo) {
            const muted = this._isMuted();
            const vol = this._getVolume();

            vid.src = this.app.data.background;
            vid.style.display = 'block';
            vid.loop = true;
            vid.muted = muted;
            if (!muted) vid.volume = vol / 100;

            
            vid.ontimeupdate = () => {
                const now = performance.now();
                if (now - this._lastTimeSave >= this._timeSaveInterval) {
                    this._lastTimeSave = now;
                    this.app.data.videoCurrentTime = vid.currentTime;
                }
            };

            this._tryPlay(vid);
            this.app.video?.startKeepAlive();
        } else {
            img.src = this.app.data.background;
            img.style.display = 'block';
        }
    }

    _tryPlay(vid) {
        if (this._playAttempts >= this._maxPlayAttempts) return;
        this._playAttempts++;

        vid.play()
            .then(() => {
                this._playAttempts = 0;
                const t = this.app.data.videoCurrentTime;
                if (t > 0 && !this.restoringTime && Math.abs(vid.currentTime - t) > 0.5) {
                    this.restoringTime = true;
                    try {
                        vid.currentTime = t;
                    } catch {
                        this.restoringTime = false;
                    }
                    vid.addEventListener('seeked', () => {
                        this.restoringTime = false;
                    }, { once: true });
                }
            })
            .catch((err) => {
                console.debug('[Background] video.play failed:', err?.message);
                setTimeout(() => this._tryPlay(vid), 1000);
            });
    }

    _isMuted() {
        return this.app.data.isMuted !== false; 
    }

    _getVolume() {
        const v = this.app.data.volume;
        return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 50;
    }

    

    extractYoutubeId(url) {
        
        const re = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/|u\/\w\/))([A-Za-z0-9_-]{11})/;
        const m = url.match(re);
        return m ? m[1] : null;
    }

    extractPlaylistId(url) {
        const m = url.match(/[&?]list=([^&]+)/);
        return m ? m[1] : null;
    }

    set() {
        const url = prompt('Введите ссылку на фон (YouTube, картинку или видео):');
        if (!url) return;

        const trimmed = url.trim();
        const isYouTube = trimmed.includes('youtube.com') || trimmed.includes('youtu.be');

        
        let nextYoutubeId = null;
        let nextPlaylistId = null;
        let nextBackground = null;

        if (isYouTube) {
            const playlistId = this.extractPlaylistId(trimmed);
            const youtubeId = this.extractYoutubeId(trimmed);

            if (playlistId) {
                nextPlaylistId = playlistId;
            } else if (youtubeId) {
                nextYoutubeId = youtubeId;
            } else {
                alert('Неверная YouTube ссылка!');
                return; 
            }
        } else {
            nextBackground = trimmed;
        }

        
        this.app.data.youtubeId = nextYoutubeId;
        this.app.data.youtubePlaylistId = nextPlaylistId;
        this.app.data.background = nextBackground;
        this.app.data.videoCurrentTime = 0;

        this.app.storage.save();
        this.apply();
    }
}

export default Background;