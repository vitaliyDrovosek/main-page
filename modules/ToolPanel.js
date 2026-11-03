/**
 * Панель инструментов строки поиска.
 *
 * Модуль владеет общим контейнером под строкой поиска и по очереди спрашивает
 * инструменты (калькулятор и переводчик), кто из них может обработать запрос.
 * Так инструменты не конфликтуют за один и тот же DOM-узел, а Enter продолжает
 * обычный поиск — панель только показывает результат.
 */
class ToolPanel {
    constructor(app) {
        this.app = app;
        this.input = null;
        this.container = null;
        this.tools = [];
        this.activeTool = null;
        this.activeData = null;

        this._token = 0;
        this._downInside = false;

        this._boundKeyDown = this._handleKeyDown.bind(this);
        this._boundDocMouseDown = this._handleDocMouseDown.bind(this);
        this._boundDocMouseUp = this._handleDocMouseUp.bind(this);
    }

    register(tool) {
        if (!tool?.id) return;
        this.tools = this.tools.filter(item => item.id !== tool.id);
        this.tools.push(tool);
        this.tools.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
    }

    init() {
        this.input = document.getElementById('searchInput');
        this.container = document.getElementById('calcResult');
        if (!this.input || !this.container) return;

        this.container.addEventListener('click', (e) => this._handleClick(e));

        this.input.addEventListener('input', () => this.render());
        this.input.addEventListener('focus', () => this.render());

        document.addEventListener('keydown', this._boundKeyDown, true);
        document.addEventListener('mousedown', this._boundDocMouseDown, true);
        document.addEventListener('mouseup', this._boundDocMouseUp, true);

        this.updateIndicators();
    }

    isToolEnabled(tool) {
        if (typeof tool.isEnabled === 'function') return !!tool.isEnabled();
        return this.app.data?.[tool.setting] !== false;
    }

    toggleTool(id) {
        const tool = this.tools.find(item => item.id === id);
        if (!tool?.setting) return;

        const enabled = this.isToolEnabled(tool);
        this.app.data[tool.setting] = !enabled;
        this.updateIndicators();
        this.app.storage.save();

        if (enabled && this.activeTool === tool) this.hide();
        else this.render();
    }

    updateIndicators() {
        for (const tool of this.tools) {
            if (!tool.indicatorId) continue;
            const indicator = document.getElementById(tool.indicatorId);
            if (indicator) indicator.classList.toggle('off', !this.isToolEnabled(tool));
        }
        this.app.dropdownSubgroups?.syncAll();
    }

    async render() {
        const query = this.input?.value?.trim() || '';
        const token = ++this._token;

        if (!query) {
            this.hide();
            return;
        }

        for (const tool of this.tools) {
            if (!this.isToolEnabled(tool)) continue;

            let data = null;
            try {
                data = await tool.render(query);
            } catch {
                data = null;
            }
            if (token !== this._token) return;
            if (!data) continue;

            this._show(tool, data);

            if (data.promise) {
                let final = null;
                try {
                    final = await data.promise;
                } catch {
                    final = null;
                }
                if (token !== this._token) return;
                if (!final) {
                    this.hide();
                    return;
                }
                this._show(tool, final);
            }
            return;
        }

        this.hide();
    }

    _show(tool, data) {
        if (!this.container) return;

        for (const other of this.tools) {
            if (other !== tool) other.cancel?.();
        }

        this.activeTool = tool;
        this.activeData = data;
        this.container.innerHTML = data.html || '';
        this.container.classList.add('visible');
        this.container.classList.toggle('is-loading', !!data.loading);
        this.container.classList.toggle('is-error', !!data.error);
    }

    hide() {
        this._token++;
        this.activeTool = null;
        this.activeData = null;

        if (this.container) {
            this.container.classList.remove('visible', 'is-loading', 'is-error');
            this.container.replaceChildren();
        }

        for (const tool of this.tools) tool.cancel?.();
    }

    _handleDocMouseDown(e) {
        this._downInside = !!(
            this.input?.contains(e.target) ||
            this.container?.contains(e.target)
        );
    }

    _handleDocMouseUp(e) {
        const isInside = !!(
            this.input?.contains(e.target) ||
            this.container?.contains(e.target)
        );
        if (!this._downInside && !isInside) this.hide();
    }

    _handleKeyDown(e) {
        if (e.key !== 'Escape') return;
        if (!this.container?.classList.contains('visible')) return;

        this.hide();
    }

    _handleClick(e) {
        const copyBtn = e.target.closest('.calc-copy-btn');
        if (copyBtn) {
            e.stopPropagation();
            if (this.activeData?.copyValue !== null && this.activeData?.copyValue !== undefined) {
                this.copyToClipboard(String(this.activeData.copyValue));
                copyBtn.classList.add('flash');
                setTimeout(() => copyBtn.classList.remove('flash'), 600);
            }
            return;
        }

        const actionBtn = e.target.closest('[data-tool-action]');
        if (!actionBtn || !this.activeTool?.onAction) return;

        e.stopPropagation();
        const tool = this.activeTool;
        const action = actionBtn.dataset.toolAction;

        Promise.resolve(tool.onAction(action, actionBtn))
            .then((data) => {
                if (!data || this.activeTool !== tool) return;
                this._show(tool, data);
            })
            .catch(() => {});
    }

    copyToClipboard(text) {
        const str = String(text);
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(str).catch(() => this.fallbackCopy(str));
            return;
        }
        this.fallbackCopy(str);
    }

    fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        Object.assign(ta.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '1px',
            height: '1px',
            opacity: '0'
        });
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, text.length);
        try { document.execCommand('copy'); } catch {}
        document.body.removeChild(ta);
    }
}

export default ToolPanel;
