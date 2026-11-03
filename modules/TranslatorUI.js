import Translator from './Translator.js';

class TranslatorUI {
    constructor(app) {
        this.app = app;
        this.id = 'translator';
        this.setting = 'translatorEnabled';
        this.indicatorId = 'translatorIndicator';
        this.priority = 30;
        this.DEBOUNCE_MS = 350;

        this._seq = 0;
        this._timer = null;
        this._resolve = null;
    }

    isEnabled() {
        return this.app.data?.translatorEnabled === true;
    }

    cancel() {
        this._seq++;
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
        if (this._resolve) {
            const resolve = this._resolve;
            this._resolve = null;
            resolve(null);
        }
    }

    render(query) {
        const plan = Translator.plan(query);
        if (!plan) return null;

        this.cancel();
        const seq = this._seq;

        const promise = new Promise((resolve) => {
            this._resolve = resolve;

            this._timer = setTimeout(async () => {
                this._timer = null;
                if (seq !== this._seq) {
                    resolve(null);
                    return;
                }

                try {
                    const result = await Translator.translate(plan.text, plan.from, plan.to);
                    if (seq !== this._seq) {
                        resolve(null);
                        return;
                    }
                    this._resolve = null;
                    resolve({
                        html: this._resultHtml(plan, result),
                        copyValue: result.text
                    });
                } catch {
                    if (seq !== this._seq) {
                        resolve(null);
                        return;
                    }
                    this._resolve = null;
                    resolve({
                        html: this._errorHtml(plan),
                        copyValue: null,
                        error: true
                    });
                }
            }, this.DEBOUNCE_MS);
        });

        return {
            html: this._loadingHtml(plan),
            copyValue: null,
            loading: true,
            promise
        };
    }

    _direction(plan) {
        return `${plan.from.toUpperCase()} → ${plan.to.toUpperCase()}`;
    }

    _loadingHtml(plan) {
        return `
            <div class="calc-result tool-result tool-result-translator">
                <div class="tool-result-main">
                    <span class="tool-result-label">${this._direction(plan)}</span>
                    <span class="tool-result-source">${this.escapeHtml(plan.text)}</span>
                    <span class="tool-result-pending"><span class="tool-spinner"></span>Перевожу…</span>
                </div>
            </div>
        `;
    }

    _resultHtml(plan, result) {
        const provider = result.provider === 'dictionary'
            ? 'словарь'
            : (result.provider === 'google' ? 'Google' : 'MyMemory');
        const note = result.cached ? `${provider} · из кэша` : provider;

        return `
            <div class="calc-result tool-result tool-result-translator">
                <div class="tool-result-main">
                    <span class="tool-result-label">${this._direction(plan)}</span>
                    <span class="tool-result-source">${this.escapeHtml(plan.text)}</span>
                    <span class="calc-result-value tool-result-value">${this.escapeHtml(result.text)}</span>
                    <span class="tool-result-detail">${note}</span>
                </div>
                <div class="tool-result-actions">
                    <button class="calc-copy-btn" title="Копировать перевод"><span class="iconify" data-icon="mdi:content-copy"></span></button>
                </div>
            </div>
        `;
    }

    _errorHtml(plan) {
        return `
            <div class="calc-result tool-result tool-result-translator tool-result-error">
                <div class="tool-result-main">
                    <span class="tool-result-label">${this._direction(plan)}</span>
                    <span class="tool-result-source">${this.escapeHtml(plan.text)}</span>
                    <span class="tool-result-detail">Не удалось перевести. Проверьте подключение к интернету.</span>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        return String(text ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}

export default TranslatorUI;
