import Calculator from './Calculator.js';

class CalculatorUI {
    constructor(app) {
        this.app = app;
        this.id = 'calculator';
        this.setting = 'calculatorEnabled';
        this.indicatorId = 'calculatorIndicator';
        this.priority = 10;
    }

    isEnabled() {
        return this.app.data?.calculatorEnabled !== false;
    }

    render(query) {
        const value = query?.trim();
        if (!value || !Calculator.isMathExpression(value)) return null;

        const result = Calculator.calculate(value);
        if (result === null) return null;

        const display = this.formatResult(result);

        return {
            html: `
                <div class="calc-result tool-result">
                    <span class="calc-result-expression">${this.escapeHtml(value)}</span>
                    <div class="calc-result-equals">
                        <span class="calc-result-value">= ${this.escapeHtml(display)}</span>
                        <button class="calc-copy-btn" title="Копировать"><span class="iconify" data-icon="mdi:content-copy"></span></button>
                    </div>
                </div>
            `,
            copyValue: display
        };
    }

    formatResult(value) {
        if (!Number.isFinite(value)) return String(value);
        if (Number.isInteger(value)) return String(value);
        return String(Number(value.toFixed(10)));
    }

    escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}

export default CalculatorUI;
