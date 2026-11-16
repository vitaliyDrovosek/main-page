import Favicon from './Favicon.js';

class Groups {
    constructor(app) {
        this.app = app;
        this._container = null;
        this._menuEl = null;
        this._menuCleanup = null;
        this._closeLinkMenuHandler = () => this._closeLinkMenu();
    }

    isLocked() {
        return this.app.data.groupsLocked === true;
    }

    _getGroups() {
        if (!Array.isArray(this.app.data.groups)) {
            this.app.data.groups = [];
        }
        return this.app.data.groups;
    }

    render() {
        const container = document.getElementById('groups');
        if (!container) return;
        this._container = container;
        this._closeLinkMenu();

        const locked = this.isLocked();
        const groups = this._getGroups();

        const fragment = document.createDocumentFragment();

        groups.forEach((group, gi) => {
            fragment.appendChild(this._renderGroup(group, gi, locked));
        });

        container.replaceChildren(fragment);
    }

    _renderGroup(group, gi, locked) {
        const div = document.createElement('div');
        div.className = 'group';
        div.classList.toggle('locked', locked);

        
        const title = document.createElement('div');
        title.className = 'group-title';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = group.name || '(без имени)';
        title.appendChild(nameSpan);

        
        nameSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            if (locked) return;
            const n = prompt('Новое имя группы:', group.name || '');
            if (n && n.trim()) {
                group.name = n.trim();
                this.app.storage.save();
                this.render();
            }
        });

        
        if (!locked) {
            const delSpan = document.createElement('span');
            delSpan.textContent = '✕';
            delSpan.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!confirm(`Удалить группу «${group.name || '(без имени)'}»?`)) return;
                this._getGroups().splice(gi, 1);
                this.app.storage.save();
                this.render();
            });
            title.appendChild(delSpan);
        }

        div.appendChild(title);

        
        div.addEventListener('click', (e) => {
            if (locked) return;
            
            if (e.target.closest('a') || e.target.closest('.group-title')) return;
            this.addTab(gi);
        });

        
        (group.links || []).forEach((link, li) => {
            div.appendChild(this._renderLink(link, locked, gi, li));
        });

        return div;
    }

    _renderLink(link, locked, gi, li) {
        const a = document.createElement('a');
        a.className = 'link';
        a.href = link.url || '#';
        a.target = '';

        const text = document.createElement('span');
        text.className = 'link-text';
        text.textContent = link.customName || link.name || link.url || '(без имени)';
        a.appendChild(text);

        if (!locked) {
            // Кнопка действий всегда доступна на тач-устройствах и
            // появляется при наведении на десктопе. Удаление спрятано
            // в меню, чтобы случайно не стереть ссылку.
            const actions = document.createElement('span');
            actions.className = 'link-actions';
            actions.textContent = '⋯';
            actions.title = 'Действия со вкладкой';
            actions.setAttribute('role', 'button');
            actions.setAttribute('tabindex', '0');

            const openMenu = (x, y) => this._openLinkMenu(x, y, gi, li);

            actions.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = actions.getBoundingClientRect();
                openMenu(rect.right, rect.bottom + 4);
            });
            actions.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                e.stopPropagation();
                const rect = actions.getBoundingClientRect();
                openMenu(rect.right, rect.bottom + 4);
            });

            a.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                openMenu(e.clientX, e.clientY);
            });

            a.appendChild(actions);
        }

        const fav = Favicon.createImg(link.url, 16, 'link-favicon');
        if (fav) a.appendChild(fav);

        return a;
    }

    _openLinkMenu(x, y, gi, li) {
        if (this.isLocked()) return;
        const group = this._getGroups()[gi];
        const link = group?.links?.[li];
        if (!link) return;

        this._closeLinkMenu();

        const menu = document.createElement('div');
        menu.className = 'link-menu';

        const addItem = (label, danger, handler) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'link-menu-item' + (danger ? ' danger' : '');
            btn.textContent = label;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._closeLinkMenu();
                handler();
            });
            menu.appendChild(btn);
        };

        addItem('Изменить название', false, () => this._renameLink(gi, li));
        addItem('Изменить URL', false, () => this._editLinkUrl(gi, li));
        addItem('Удалить вкладку', true, () => this._deleteLink(gi, li));

        document.body.appendChild(menu);
        this._menuEl = menu;

        const rect = menu.getBoundingClientRect();
        const margin = 10;
        menu.style.left = Math.min(Math.max(margin, x), window.innerWidth - rect.width - margin) + 'px';
        menu.style.top = Math.min(Math.max(margin, y), window.innerHeight - rect.height - margin) + 'px';

        const onPointerDown = (e) => {
            if (this._menuEl?.contains(e.target)) return;
            this._closeLinkMenu();
        };
        const onKeyDown = (e) => {
            if (e.key === 'Escape') this._closeLinkMenu();
        };

        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('scroll', this._closeLinkMenuHandler, true);
        window.addEventListener('resize', this._closeLinkMenuHandler);

        this._menuCleanup = () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown, true);
            window.removeEventListener('scroll', this._closeLinkMenuHandler, true);
            window.removeEventListener('resize', this._closeLinkMenuHandler);
        };
    }

    _closeLinkMenu() {
        if (this._menuCleanup) {
            this._menuCleanup();
            this._menuCleanup = null;
        }
        this._menuEl?.remove();
        this._menuEl = null;
    }

    _renameLink(gi, li) {
        const group = this._getGroups()[gi];
        const link = group?.links?.[li];
        if (!link) return;

        const value = prompt('Отображаемое имя:', link.customName || link.name || '');
        if (value === null) return;

        link.customName = value.trim() || link.customName || link.name || link.url;
        this.app.storage.save();
        this.render();
    }

    _editLinkUrl(gi, li) {
        const group = this._getGroups()[gi];
        const link = group?.links?.[li];
        if (!link) return;

        const value = prompt('URL:', link.url || '');
        if (value === null || !value.trim()) return;

        link.url = value.trim();
        this.app.storage.save();
        this.render();
    }

    _deleteLink(gi, li) {
        const group = this._getGroups()[gi];
        const link = group?.links?.[li];
        if (!group || !link) return;

        const name = link.customName || link.name || link.url || 'вкладку';
        if (!confirm(`Удалить «${name}» из группы «${group.name || '(без имени)'}»?`)) return;

        group.links.splice(li, 1);
        this.app.storage.save();
        this.render();
    }

    add() {
        if (this.isLocked()) {
            alert('Группы заблокированы. Отключите блокировку в настройках.');
            return;
        }
        const name = prompt('Название группы:');
        if (!name || !name.trim()) return;

        this._getGroups().push({ name: name.trim(), links: [] });
        this.app.storage.save();
        this.render();
    }

    addTab(groupIndex) {
        if (this.isLocked()) return;

        const groups = this._getGroups();
        const group = groups[groupIndex];
        if (!group) return;

        const display = prompt('Отображаемое имя:');
        if (!display || !display.trim()) return;

        const url = prompt('URL:');
        if (!url || !url.trim()) return;

        if (!Array.isArray(group.links)) group.links = [];
        group.links.push({ customName: display.trim(), url: url.trim() });

        this.app.storage.save();
        this.render();
    }
}

export default Groups;