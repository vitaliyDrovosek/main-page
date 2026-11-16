import Icons from './Icons.js';

class Notes {
    constructor(app) {
        this.app = app;
        this.btn = null;
        this.panel = null;
        this.list = null;
        this.visible = false;
        this.saveTimers = new Map();
        this.emptyNoteIds = new Set();

        this.draggingId = null;
        this.dragEl = null;
        this._justDragged = false;
        this._downInside = false;

        this._initialized = false;
    }

    init() {
        if (this._initialized) return;
        this._initialized = true;

        this.btn = document.getElementById('notesBtn');
        this.panel = document.getElementById('notesPanel');
        this.list = document.getElementById('notesList');
        if (!this.btn || !this.panel || !this.list) return;

        this.btn.addEventListener('click', () => this.toggle());
        document.getElementById('notesCloseBtn')?.addEventListener('click', () => this.hide());
        document.getElementById('notesAddBtn')?.addEventListener('click', () => this.addNote());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.visible) this.hide();
        });

        window.addEventListener('beforeunload', () => {
            this.flushSaves();
            this.dropEmptyNotes();
        });

        this.list.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                const ta = e.target.closest('.note-text');
                if (ta) {
                    e.preventDefault();
                    const id = ta.closest('.note-card')?.dataset.id;
                    if (id) this.updateNoteText(id, ta.value);
                    ta.blur();
                }
            }
        });

        this.list.addEventListener('mousedown', (e) => {
            if (e.target.closest('.note-action')) return;
            const header = e.target.closest('.note-card-header');
            if (!header) return;
            const card = header.closest('.note-card');
            if (!card) return;
            this.startDrag(card.dataset.id, e, card);
        });

        this.list.addEventListener('touchstart', (e) => {
            if (e.target.closest('.note-action')) return;
            const header = e.target.closest('.note-card-header');
            if (!header) return;
            const card = header.closest('.note-card');
            if (!card) return;
            this.startDrag(card.dataset.id, e.touches[0], card);
        }, { passive: false });

        document.addEventListener('mousedown', (e) => {
            if (!this.visible) return;
            const el = e.target;
            this._downInside = !!(el.closest && (
                el.closest('#notesPanel') ||
                el.closest('#notesBtn')
            ));
        }, true);

        document.addEventListener('mouseup', (e) => {
            if (!this.visible) return;
            const el = e.target;
            const upInside = !!(el.closest && (
                el.closest('#notesPanel') ||
                el.closest('#notesBtn')
            ));

            if (this._justDragged) {
                this._justDragged = false;
                return;
            }
            if (!this._downInside && !upInside) {
                this.hide();
            }
        }, true);

        this.getNotes();
        this.render();
        this.updateVisibility();
        this.updateIndicator();
    }

    

    getNotes() {
        if (!Array.isArray(this.app.data.notes)) {
            const old = this.app.data.notes;
            if (typeof old === 'string' && old.trim()) {
                this.app.data.notes = [{ id: this.genId(), text: old, createdAt: Date.now(), pinned: false, order: 0 }];
            } else {
                this.app.data.notes = [];
            }
            this.app.storage?.save();
        }
        let migrated = false;
        for (let i = 0; i < this.app.data.notes.length; i++) {
            const n = this.app.data.notes[i];
            if (typeof n.pinned !== 'boolean') { n.pinned = false; migrated = true; }
            if (typeof n.order !== 'number') { n.order = i; migrated = true; }
        }
        if (migrated) this.app.storage?.save();
        return this.app.data.notes;
    }

    sortNotes(notes) {
        return [...notes].sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return (a.order ?? 0) - (b.order ?? 0);
        });
    }

    genId() {
        return 'n_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }

    

    addNote() {
        const notes = this.getNotes();
        const unpinned = notes.filter(n => !n.pinned);
        const minOrder = unpinned.length ? Math.min(...unpinned.map(n => n.order ?? 0)) : 0;
        const note = {
            id: this.genId(),
            text: '',
            createdAt: Date.now(),
            pinned: false,
            order: minOrder - 1
        };
        notes.push(note);
        this.emptyNoteIds.add(note.id);
        this.app.storage.save();
        this.render();
        setTimeout(() => {
            const ta = this.list.querySelector(`[data-id="${note.id}"] .note-text`);
            if (ta) { ta.focus(); ta.scrollIntoView({ block: 'nearest' }); }
        }, 50);
    }

    deleteNote(id) {
        clearTimeout(this.saveTimers.get(id));
        this.saveTimers.delete(id);
        this.emptyNoteIds.delete(id);

        const card = this.list.querySelector(`[data-id="${id}"]`);
        if (card) card.classList.add('removing');

        setTimeout(() => {
            const notes = this.getNotes();
            const idx = notes.findIndex(n => n.id === id);
            if (idx === -1) { this.render(); return; }
            notes.splice(idx, 1);
            this.app.storage.save();
            this.render();
        }, 180);
    }

    togglePin(id) {
        const notes = this.getNotes();
        const note = notes.find(n => n.id === id);
        if (!note) return;
        note.pinned = !note.pinned;
        note.updatedAt = Date.now();
        this.app.storage.save();
        this.render();
    }

    dropIfEmpty(id) {
        if (!this.emptyNoteIds.has(id)) return;
        const notes = this.getNotes();
        const note = notes.find(n => n.id === id);
        if (!note) return;

        if (!note.text.trim()) {
            clearTimeout(this.saveTimers.get(id));
            this.saveTimers.delete(id);
            this.emptyNoteIds.delete(id);

            const idx = notes.indexOf(note);
            if (idx !== -1) notes.splice(idx, 1);
            this.app.storage.save();
            this.render();
        } else {
            this.emptyNoteIds.delete(id);
        }
    }

    dropEmptyNotes() {
        const notes = this.getNotes();
        const filtered = notes.filter(n => (n.text || '').trim() !== '');
        if (filtered.length !== notes.length) {
            this.app.data.notes = filtered;
            this.app.storage.save();
        }
        this.emptyNoteIds.clear();
    }

    

    async copyNote(id) {
        const notes = this.getNotes();
        const note = notes.find(n => n.id === id);
        if (!note) return;

        const text = (note.text || '').trim();
        if (!text) { this.flashCopy(id, '×'); return; }

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                this.legacyCopy(text);
            }
            this.flashCopy(id, '✓');
        } catch {
            try { this.legacyCopy(text); this.flashCopy(id, '✓'); }
            catch { this.flashCopy(id, '×'); }
        }
    }

    legacyCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        Object.assign(ta.style, {
            position: 'fixed', top: '0', left: '0',
            width: '1px', height: '1px',
            padding: '0', border: 'none', outline: 'none',
            boxShadow: 'none', background: 'transparent', opacity: '0'
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

    flashCopy(id, text) {
        const btn = this.list.querySelector(`[data-id="${id}"] .note-copy`);
        if (!btn) return;
        const original = btn.dataset.original || btn.textContent;
        btn.dataset.original = original;
        btn.textContent = text;
        btn.classList.add('flash');
        setTimeout(() => {
            btn.textContent = original;
            btn.classList.remove('flash');
        }, 1000);
    }

    

    updateNoteText(id, text) {
        const notes = this.getNotes();
        const note = notes.find(n => n.id === id);
        if (!note) return;

        note.text = text;
        note.updatedAt = Date.now();

        if (text.trim() && this.emptyNoteIds.has(id)) {
            this.emptyNoteIds.delete(id);
        }

        clearTimeout(this.saveTimers.get(id));
        this.saveTimers.set(id, setTimeout(() => {
            this.app.storage.save();
            this.saveTimers.delete(id);
        }, 400));
    }

    flushSaves() {
        for (const t of this.saveTimers.values()) clearTimeout(t);
        this.saveTimers.clear();
        this.dropEmptyNotes();
        this.app.storage.save();
    }

    

    render() {
        if (!this.list) return;
        const notes = this.getNotes();
        const sorted = this.sortNotes(notes);

        if (sorted.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'notes-empty';
            empty.textContent = 'Пока нет заметок. Нажмите «+», чтобы создать.';
            this.list.replaceChildren(empty);
            return;
        }

        const fragment = document.createDocumentFragment();

        for (const n of sorted) {
            fragment.appendChild(this._renderCard(n));
        }

        this.list.replaceChildren(fragment);
    }

    _renderCard(n) {
        const card = document.createElement('div');
        card.className = 'note-card' + (n.pinned ? ' pinned' : '');
        card.dataset.id = n.id;

        
        const header = document.createElement('div');
        header.className = 'note-card-header';

        const dateEl = document.createElement('span');
        dateEl.className = 'note-date';
        dateEl.textContent = this.formatDate(n.createdAt);

        const actions = document.createElement('div');
        actions.className = 'note-card-actions';

        const pinBtn = this._makeButton('note-action note-pin' + (n.pinned ? ' active' : ''),
            n.pinned ? 'Открепить' : 'Закрепить',
            n.pinned ? 'pin' : 'pin-outline');
        pinBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePin(n.id);
        });

        const copyBtn = this._makeButton('note-action note-copy', 'Копировать', 'copy');
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.copyNote(n.id);
        });

        const delBtn = this._makeButton('note-action note-delete', 'Удалить', 'trash');
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteNote(n.id);
        });

        actions.append(pinBtn, copyBtn, delBtn);
        header.append(dateEl, actions);

        
        const ta = document.createElement('textarea');
        ta.className = 'note-text';
        ta.placeholder = 'Текст заметки...';
        ta.spellcheck = false;
        ta.value = n.text || '';

        ta.addEventListener('input', () => this.updateNoteText(n.id, ta.value));
        ta.addEventListener('blur', () => { if (!ta.value.trim()) this.dropIfEmpty(n.id); });

        card.append(header, ta);
        return card;
    }

    _makeButton(className, title, icon) {
        const btn = document.createElement('button');
        btn.className = className;
        btn.title = title;
        btn.appendChild(Icons.create(icon));
        return btn;
    }

    

    startDrag(id, e, card) {
        if (!e) return;
        this.draggingId = id;
        this.dragEl = card;
        card.classList.add('dragging-card');
        this._justDragged = false;

        this._moveHandler = (ev) => this.onDragMove(ev);
        this._endHandler = () => this.onDragEnd();
        document.addEventListener('mousemove', this._moveHandler);
        document.addEventListener('mouseup', this._endHandler);
        document.addEventListener('touchmove', this._moveHandler, { passive: false });
        document.addEventListener('touchend', this._endHandler);
    }

    onDragMove(e) {
        if (!this.draggingId || !this.dragEl) return;
        if (e.touches) e.preventDefault();
        const cy = e.touches ? e.touches[0].clientY : e.clientY;

        const cards = [...this.list.querySelectorAll('.note-card')];
        const target = cards.find(c => {
            if (c === this.dragEl) return false;
            const r = c.getBoundingClientRect();
            return cy >= r.top && cy <= r.bottom;
        });

        if (target && target !== this.dragEl) {
            const targetRect = target.getBoundingClientRect();
            const before = cy < targetRect.top + targetRect.height / 2;
            if (before) {
                this.list.insertBefore(this.dragEl, target);
            } else {
                this.list.insertBefore(this.dragEl, target.nextSibling);
            }
        }
    }

    onDragEnd() {
        if (!this.draggingId) return;
        const draggedId = this.draggingId;
        this.draggingId = null;
        this.dragEl?.classList.remove('dragging-card');
        this.dragEl = null;

        document.removeEventListener('mousemove', this._moveHandler);
        document.removeEventListener('mouseup', this._endHandler);
        document.removeEventListener('touchmove', this._moveHandler);
        document.removeEventListener('touchend', this._endHandler);

        const cards = [...this.list.querySelectorAll('.note-card')];
        const ids = cards.map(c => c.dataset.id);

        const draggedPos = ids.indexOf(draggedId);

        const notes = this.getNotes();
        const draggedNote = notes.find(n => n.id === draggedId);
        if (draggedNote && draggedNote.pinned) {
            let hasUnpinnedBelow = false;
            for (let i = draggedPos + 1; i < ids.length; i++) {
                const n = notes.find(x => x.id === ids[i]);
                if (n && !n.pinned) { hasUnpinnedBelow = true; break; }
            }
            if (hasUnpinnedBelow) {
                draggedNote.pinned = false;
                draggedNote.updatedAt = Date.now();
            }
        }

        ids.forEach((id, idx) => {
            const n = notes.find(x => x.id === id);
            if (n) n.order = idx;
        });

        this.app.storage.save();
        this.render();

        this._justDragged = true;
        setTimeout(() => { this._justDragged = false; }, 50);
    }

    

    formatDate(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        const pad = n => String(n).padStart(2, '0');
        return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    updateVisibility() {
        if (!this.btn) return;
        const enabled = this.app.data.notesButtonEnabled !== false;
        this.btn.style.display = enabled ? 'flex' : 'none';
        if (!enabled) this.hide();
    }

    updateIndicator() {
        const indicator = document.getElementById('notesIndicator');
        if (!indicator) return;
        indicator.classList.toggle('off', this.app.data.notesButtonEnabled === false);
    }

    toggleButton() {
        const cur = this.app.data.notesButtonEnabled !== false;
        this.app.data.notesButtonEnabled = !cur;
        this.updateVisibility();
        this.updateIndicator();
        this.app.storage.save();
    }

    toggle() { this.visible ? this.hide() : this.show(); }

    show() {
        this.render();
        this.panel.classList.add('visible');
        this.visible = true;
        const overlay = document.getElementById('mobileHudOverlay');
        if (overlay) overlay.classList.add('visible');
    }

    hide() {
        this.flushSaves();
        
        this.panel.classList.remove('visible');
        this.visible = false;
        const overlay = document.getElementById('mobileHudOverlay');
        if (overlay) overlay.classList.remove('visible');
    }
}

export default Notes;