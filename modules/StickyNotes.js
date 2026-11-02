class StickyNotes {
    constructor(app) {
        this.app = app;
        this.container = null;
        this.enabled = false;
        this.draggingId = null;
        this.dragEl = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.saveTimers = new Map();

        this.boundMouseMove = this.onDragMove.bind(this);
        this.boundMouseUp = this.onDragEnd.bind(this);
        this.boundTouchMove = this.onDragMove.bind(this);
        this.boundTouchEnd = this.onDragEnd.bind(this);
        this.boundDocClick = this.onDocumentClick.bind(this);

        this.resizingId = null;
        this.resizeEl = null;
        this.resizeDir = null;
        this.resizeStartX = 0;
        this.resizeStartY = 0;
        this.resizeStartW = 0;
        this.resizeStartH = 0;
        this.boundResizeMove = this.onResizeMove.bind(this);
        this.boundResizeEnd = this.onResizeEnd.bind(this);

        this._initialized = false;
    }

    init() {
        if (this._initialized) return;
        this._initialized = true;

        this.container = document.getElementById('stickyNotesContainer');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'stickyNotesContainer';
            this.container.className = 'sticky-notes-container';
            document.body.appendChild(this.container);
        }

        this.enabled = this.app.data.stickyNotesEnabled === true;
        this.updateVisibility();
        this.render();

        document.getElementById('stickyAddBtn')?.addEventListener('click', () => this.addNote());
        document.addEventListener('click', this.boundDocClick);

        window.addEventListener('beforeunload', () => this.flushSaves());
        this.updateIndicator();
    }

    updateVisibility() {
        if (!this.container) return;
        this.container.classList.toggle('visible', this.enabled);
    }

    updateIndicator() {
        const indicator = document.getElementById('stickyNotesIndicator');
        if (indicator) indicator.classList.toggle('off', !this.enabled);
    }

    toggle() {
        this.enabled = !this.enabled;
        this.app.data.stickyNotesEnabled = this.enabled;
        this.updateVisibility();
        this.updateIndicator();
        this.app.storage.save();
    }

    getNotes() {
        if (!Array.isArray(this.app.data.stickyNotes)) {
            this.app.data.stickyNotes = [];
        }
        return this.app.data.stickyNotes;
    }

    genId() {
        return 'sn_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }

    addNote() {
        if (!this.enabled) this.toggle();

        const notes = this.getNotes();
        const note = {
            id: this.genId(),
            text: '',
            x: 100 + Math.random() * 200,
            y: 100 + Math.random() * 200,
            color: 'yellow',
            expanded: false,
            width: 240,
            height: 240,
            createdAt: Date.now()
        };
        notes.push(note);
        this.app.storage.save();
        this.render();

        setTimeout(() => {
            const el = this.container.querySelector(`[data-id="${note.id}"] .sticky-text`);
            if (el) el.focus();
        }, 80);
    }

    deleteNote(id) {
        const el = this.container.querySelector(`[data-id="${id}"]`);
        if (el) el.classList.add('removing');

        setTimeout(() => {
            const notes = this.getNotes();
            const idx = notes.findIndex(n => n.id === id);
            if (idx === -1) { this.render(); return; }
            notes.splice(idx, 1);
            this.app.storage.save();
            this.render();
        }, el ? 200 : 0);
    }

    updateNoteText(id, text) {
        const notes = this.getNotes();
        const note = notes.find(n => n.id === id);
        if (!note) return;
        note.text = text;
        note.updatedAt = Date.now();

        clearTimeout(this.saveTimers.get(id));
        this.saveTimers.set(id, setTimeout(() => {
            this.app.storage.save();
            this.saveTimers.delete(id);
        }, 400));
    }

    updateNoteColor(id, color) {
        const notes = this.getNotes();
        const note = notes.find(n => n.id === id);
        if (!note) return;
        note.color = color;
        this.app.storage.save();
        this.render();
    }

    updateNotePosition(id, x, y) {
        const notes = this.getNotes();
        const note = notes.find(n => n.id === id);
        if (!note) return;
        note.x = x;
        note.y = y;
        this.app.storage.save();
    }

    toggleExpand(id) {
        const notes = this.getNotes();
        const note = notes.find(n => n.id === id);
        if (!note) return;

        note.expanded = !note.expanded;
        this.app.storage.save();

        const el = this.container.querySelector(`[data-id="${id}"]`);
        if (el) {
            el.classList.toggle('expanded', !!note.expanded);
            const ta = el.querySelector('.sticky-text');

            if (note.expanded) {
                el.style.height = '';
                if (ta) {
                    ta.style.height = '';
                    ta.style.maxHeight = '50vh';
                    ta.style.overflowY = 'auto';
                }
            } else {
                el.style.height = '';
                if (ta) {
                    ta.style.height = 'auto';
                    ta.style.maxHeight = '';
                    ta.style.overflowY = '';
                }
                // если размер ручной — textarea заполняет стикер
                if (note.height) this.fitTextareaToNote(ta, el);
                else this.autoGrowText(ta);
            }
            this.updateReadMoreButton(id);
        }
    }

    render() {
        if (!this.container) return;
        const notes = this.getNotes();

        const fragment = document.createDocumentFragment();
        for (const note of notes) {
            fragment.appendChild(this._renderNote(note));
        }
        this.container.replaceChildren(fragment);
    }

    _renderNote(note) {
        const el = document.createElement('div');
        el.className = `sticky-note color-${note.color || 'yellow'}${note.expanded ? ' expanded' : ''}`;
        el.dataset.id = note.id;
        el.style.left = (note.x ?? 100) + 'px';
        el.style.top = (note.y ?? 100) + 'px';
        if (note.width)  el.style.width  = Math.max(240, note.width)  + 'px';
        if (note.height) el.style.height = Math.max(240, note.height) + 'px';
            el.dataset.manualSize = '1';
            el.dataset.manualSize = '1';

        el.innerHTML = `
            <div class="sticky-drag-handle" title="Перетащить">⠿</div>
            <div class="sticky-header">
                <button class="sticky-menu-btn" title="Меню">⋮</button>
                <div class="sticky-menu">
                    <div class="sticky-menu-colors">
                        <button class="sticky-color-btn color-yellow" data-color="yellow" title="Жёлтый"></button>
                        <button class="sticky-color-btn color-pink" data-color="pink" title="Розовый"></button>
                        <button class="sticky-color-btn color-blue" data-color="blue" title="Голубой"></button>
                        <button class="sticky-color-btn color-green" data-color="green" title="Зелёный"></button>
                        <button class="sticky-color-btn color-purple" data-color="purple" title="Фиолетовый"></button>
                    </div>
                    <button class="sticky-menu-delete" title="Удалить">Удалить</button>
                </div>
            </div>
            <div class="sticky-body">
                <textarea class="sticky-text" placeholder="Заметка..." spellcheck="false"></textarea>
                <div class="sticky-actions">
                    <button class="sticky-copy" title="Копировать">
                        <span class="iconify" data-icon="mdi:content-copy"></span>
                    </button>
                    <button class="sticky-read-more" style="display:none;" title="Развернуть заметку">
                        <span class="sticky-read-more-text">Развернуть</span>
                    </button>
                </div>
            </div>
            <div class="sticky-resize-handle sticky-resize-right"  data-dir="right"></div>
            <div class="sticky-resize-handle sticky-resize-bottom" data-dir="bottom"></div>
            <div class="sticky-resize-handle sticky-resize-corner" data-dir="corner"></div>
        `;

        const textEl = el.querySelector('.sticky-text');
        textEl.value = note.text || '';

        const menuBtn = el.querySelector('.sticky-menu-btn');
        const menu = el.querySelector('.sticky-menu');
        const readMoreBtn = el.querySelector('.sticky-read-more');
        const delBtn = el.querySelector('.sticky-menu-delete');
        const copyBtn = el.querySelector('.sticky-copy');

        const dragHandle = el.querySelector('.sticky-drag-handle');
        dragHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.startDrag(note.id, e, el);
        });
        dragHandle.addEventListener('touchstart', (e) => {
            this.startDrag(note.id, e.touches[0], el);
        }, { passive: false });

        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = menu.classList.contains('visible');
            this.closeAllMenus();
            if (!isOpen) menu.classList.add('visible');
        });

        el.querySelectorAll('.sticky-color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.updateNoteColor(note.id, btn.dataset.color);
            });
        });

        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteNote(note.id);
        });

        textEl.addEventListener('input', () => {
            this.updateNoteText(note.id, textEl.value || '');
            if (!note.height) this.autoGrowText(textEl);
            this.updateReadMoreButton(note.id);
        });

        readMoreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleExpand(note.id);
        });

        copyBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.copyNote(note.id);
        });

        el.querySelectorAll('.sticky-resize-handle').forEach(handle => {
            const dir = handle.dataset.dir;
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.startResize(note.id, e, el, dir);
            });
            handle.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                this.startResize(note.id, e.touches[0], el, dir);
            }, { passive: false });
        });

        requestAnimationFrame(() => {
            if (note.height) {
                // ручной размер — textarea растягивается вместе со стикером
                this.fitTextareaToNote(textEl, el);
            } else {
                this.autoGrowText(textEl);
            }
            this.updateReadMoreButton(note.id);
            this._clampToScreen(el);
        });

        return el;
    }

    autoGrowText(el, skip = false) {
        if (!el || skip) return;
        const noteEl = el.closest('.sticky-note');
        const isExpanded = noteEl && noteEl.classList.contains('expanded');
        const maxH = isExpanded ? window.innerHeight * 0.5 : Infinity;

        el.style.height = 'auto';
        el.style.flex = '0 0 auto';
        if (isExpanded) {
            el.style.maxHeight = '50vh';
            el.style.overflowY = 'auto';
        } else {
            el.style.maxHeight = '';
        }

        const contentH = el.scrollHeight;
        el.style.height = Math.min(contentH, maxH) + 'px';
        el.style.overflowY = contentH > maxH ? 'auto' : 'hidden';

        if (noteEl) {
        if (noteEl.dataset.manualSize === '1') return;
        noteEl.style.height = 'auto';
        noteEl.style.minHeight = '';
    }
    }

    /**
     * Переводит textarea в режим "заполни родителя".
     * Используется, когда у стикера задан note.height (ручной ресайз).
     * Тогда textarea растягивается/сжимается вместе с .sticky-note.
     */
    fitTextareaToNote(ta, noteEl) {
        if (!ta) return;
        ta.style.flex = '1 1 auto';
        ta.style.height = 'auto';
        ta.style.minHeight = '0';
        ta.style.maxHeight = 'none';
        ta.style.overflowY = 'auto';
    }

    updateReadMoreButton(id) {
        const el = this.container.querySelector(`[data-id="${id}"]`);
        if (!el) return;
        const textEl = el.querySelector('.sticky-text');
        const btn = el.querySelector('.sticky-read-more');
        const textSpan = el.querySelector('.sticky-read-more-text');
        if (!textEl || !btn) return;

        // В развёрнутом — всегда показываем «Свернуть»
        if (el.classList.contains('expanded')) {
            btn.style.display = 'flex';
            btn.title = 'Свернуть заметку';
            if (textSpan) textSpan.textContent = 'Свернуть';
            return;
        }

        // Если ручной resize — не показываем
        const note = this.getNotes().find(n => n.id === id);
        if (note && note.height) {
            btn.style.display = 'none';
            return;
        }

        // Иначе — проверяем переполнение
        if (textEl.scrollHeight > textEl.clientHeight + 4) {
            btn.style.display = 'flex';
            btn.title = 'Развернуть заметку';
            if (textSpan) textSpan.textContent = 'Развернуть';
        } else {
            btn.style.display = 'none';
        }
    }

    async copyNote(id) {
        const notes = this.getNotes();
        const note = notes.find(n => n.id === id);
        if (!note) return;

        const text = (note.text || '').trim();
        if (!text) return;

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                this.legacyCopy(text);
            }
            this.flashCopy(id);
        } catch {
            try { this.legacyCopy(text); this.flashCopy(id); } catch {}
        }
    }

    legacyCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        Object.assign(ta.style, {
            position: 'fixed', top: '0', left: '0',
            width: '1px', height: '1px', opacity: '0'
        });
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, text.length);
        let ok = false;
        try { ok = document.execCommand('copy'); } catch { ok = false; }
        document.body.removeChild(ta);
        if (!ok) throw new Error('copy failed');
    }

    flashCopy(id) {
        const el = this.container.querySelector(`[data-id="${id}"]`);
        if (!el) return;
        const btn = el.querySelector('.sticky-copy');
        if (!btn) return;
        btn.classList.add('flash');
        setTimeout(() => btn.classList.remove('flash'), 1000);
    }

    startResize(id, e, el, dir) {
        if (!e) return;
        this.resizingId = id;
        this.resizeEl = el;
        this.resizeDir = dir;
        this.resizeStartX = e.clientX;
        this.resizeStartY = e.clientY;
        const rect = el.getBoundingClientRect();
        this.resizeStartW = rect.width;
        this.resizeStartH = rect.height;

        el.classList.add('resizing');

        const ta = el.querySelector('.sticky-text');
        if (ta) this.fitTextareaToNote(ta, el);

        document.addEventListener('mousemove', this.boundResizeMove);
        document.addEventListener('mouseup', this.boundResizeEnd);
        document.addEventListener('touchmove', this.boundResizeMove, { passive: false });
        document.addEventListener('touchend', this.boundResizeEnd);
    }

    onResizeMove(e) {
        if (!this.resizingId || !this.resizeEl) return;
        if (e.touches) e.preventDefault();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        const dx = cx - this.resizeStartX;
        const dy = cy - this.resizeStartY;

        if (this.resizeDir === 'right' || this.resizeDir === 'corner') {
            const w = Math.max(240, Math.min(600, this.resizeStartW + dx));
            this.resizeEl.style.width = w + 'px';
        }
        if (this.resizeDir === 'bottom' || this.resizeDir === 'corner') {
            const rect = this.resizeEl.getBoundingClientRect();
            const top = rect.top;
            const maxH = window.innerHeight - top - 10;
            const h = Math.max(240, Math.min(maxH, this.resizeStartH + dy));
            this.resizeEl.style.height = h + 'px';
        }
    }

    onResizeEnd() {
        if (!this.resizingId || !this.resizeEl) return;
        const id = this.resizingId;
        const el = this.resizeEl;
        const w = parseInt(el.style.width, 10);
        const h = parseInt(el.style.height, 10);

        el.classList.remove('resizing');
        document.removeEventListener('mousemove', this.boundResizeMove);
        document.removeEventListener('mouseup', this.boundResizeEnd);
        document.removeEventListener('touchmove', this.boundResizeMove);
        document.removeEventListener('touchend', this.boundResizeEnd);

        this.resizingId = null;
        this.resizeEl = null;
        this.resizeDir = null;

        const notes = this.getNotes();
        const note = notes.find(n => n.id === id);
        if (note) {
            if (Number.isFinite(w)) note.width  = Math.max(240, w);
            if (Number.isFinite(h)) note.height = Math.max(240, h);
            this.app.storage.save();
        }

        // после ресайза — textarea заполняет стикер
        const ta = el.querySelector('.sticky-text');
        if (ta && note && note.height) {
            this.fitTextareaToNote(ta, el);
        }

        setTimeout(() => this.updateReadMoreButton(id), 50);
    }

    startDrag(id, e, el) {
        if (!e) return;
        this.draggingId = id;
        this.dragEl = el;
        const rect = el.getBoundingClientRect();
        this.dragOffsetX = e.clientX - rect.left;
        this.dragOffsetY = e.clientY - rect.top;
        el.classList.add('dragging');
        el.style.zIndex = 10000;

        this.closeAllMenus();

        document.addEventListener('mousemove', this.boundMouseMove);
        document.addEventListener('mouseup', this.boundMouseUp);
        document.addEventListener('touchmove', this.boundTouchMove, { passive: false });
        document.addEventListener('touchend', this.boundTouchEnd);
    }

    onDragMove(e) {
        if (!this.draggingId || !this.dragEl) return;
        if (e.touches) e.preventDefault();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;

        const rect = this.dragEl.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        const x = Math.max(0, Math.min(window.innerWidth  - w, cx - this.dragOffsetX));
        const y = Math.max(0, Math.min(window.innerHeight - h, cy - this.dragOffsetY));

        this.dragEl.style.left = x + 'px';
        this.dragEl.style.top  = y + 'px';
    }

    onDragEnd() {
        if (!this.draggingId || !this.dragEl) return;
        const id = this.draggingId;
        const el = this.dragEl;
        const x = parseInt(el.style.left, 10);
        const y = parseInt(el.style.top, 10);

        el.classList.remove('dragging');
        el.style.zIndex = '';

        document.removeEventListener('mousemove', this.boundMouseMove);
        document.removeEventListener('mouseup', this.boundMouseUp);
        document.removeEventListener('touchmove', this.boundTouchMove);
        document.removeEventListener('touchend', this.boundTouchEnd);

        this.draggingId = null;
        this.dragEl = null;

        if (Number.isFinite(x) && Number.isFinite(y)) {
            this.updateNotePosition(id, x, y);
        }
    }

    closeAllMenus() {
        this.container?.querySelectorAll('.sticky-menu.visible').forEach(m => m.classList.remove('visible'));
    }

    onDocumentClick(e) {
        if (!e.target.closest('.sticky-menu') && !e.target.closest('.sticky-menu-btn')) {
            this.closeAllMenus();
        }
    }

    _clampToScreen(el) {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const gap = 10;
        let x = r.left;
        let y = r.top;

        if (r.bottom > window.innerHeight - gap) {
            y = Math.max(gap, window.innerHeight - r.height - gap);
        }
        if (r.right > window.innerWidth - gap) {
            x = Math.max(gap, window.innerWidth - r.width - gap);
        }
        if (r.left < gap) x = gap;
        if (r.top  < gap) y = gap;

        if (x !== r.left) el.style.left = x + 'px';
        if (y !== r.top)  el.style.top  = y + 'px';
    }

    flushSaves() {
        for (const t of this.saveTimers.values()) clearTimeout(t);
        this.saveTimers.clear();
        this.app.storage.save();
    }
}

export default StickyNotes;