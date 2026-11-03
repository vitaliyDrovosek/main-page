class Calculator {
    static isMathExpression(str) {
        if (!str || !str.trim()) return false;
        const s = str.trim().toLowerCase();

        
        if (this.hasPercentPhrase(s) && /\d/.test(s)) return true;

        
        
        const hasOperator = /[+\-*/()%^]/.test(s);
        const onlyDigits = /^[\d\s.]+$/.test(s);
        if (onlyDigits) return false;

        return /^[\d\s+\-*/().%^]+$/.test(s) && /\d/.test(s) && hasOperator;
    }

    static hasPercentPhrase(str) {
        
        return (/процент/i.test(str) && /\bот\b/i.test(str)) || /%\s*от/i.test(str);
    }

    static calculate(str) {
        if (!str) return null;
        const s = str.trim().toLowerCase();

        
        const phraseResult = this.parsePercentPhrase(s);
        if (phraseResult !== null) return phraseResult;

        
        return this._parse(s);
    }

    static parsePercentPhrase(str) {
        
        const s = str.replace(/^сколько\s+будет\s+/i, '').trim();

        let match = s.match(/^(.+?)\s+процент(?:а|ов)?\s+от\s+(.+)$/i);
        if (!match) {
            match = s.match(/^(.+?)\s*%\s*от\s+(.+)$/i);
        }
        if (!match) return null;

        const n = this.evalSimple(match[1].trim());
        const total = this.evalSimple(match[2].trim());

        if (n === null || total === null) return null;

        return (n / 100) * total;
    }

    static evalSimple(str) {
        if (!str) return null;
        return this._parse(str);
    }

    
    static _parse(str) {
        if (!str) return null;
        try {
            const tokens = this.tokenize(str.replace(/\*\*/g, '^'));
            if (!tokens.length) return null;
            const parser = new _Parser(tokens);
            const result = parser.parseExpression();
            if (!parser.isEnd()) return null;
            if (!Number.isFinite(result)) return null;
            return result;
        } catch {
            return null;
        }
    }

    static tokenize(str) {
        const tokens = [];
        let i = 0;
        const s = str.replace(/\s+/g, '');
        const isDigit = (ch) => ch >= '0' && ch <= '9';

        while (i < s.length) {
            const ch = s[i];

            if (isDigit(ch) || ch === '.') {
                let num = '';
                let dotCount = 0;
                while (i < s.length && (isDigit(s[i]) || s[i] === '.')) {
                    if (s[i] === '.') dotCount++;
                    num += s[i];
                    i++;
                }
                if (dotCount > 1 || num === '.') {
                    throw new Error('Invalid number: ' + num);
                }
                const value = parseFloat(num);
                if (!Number.isFinite(value)) {
                    throw new Error('Invalid number: ' + num);
                }
                tokens.push({ type: 'num', value });
            } else if ('+-*/()%^'.includes(ch)) {
                tokens.push({ type: 'op', value: ch });
                i++;
            } else {
                throw new Error('Invalid char: ' + ch);
            }
        }
        return tokens;
    }
}

class _Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    isEnd() {
        return this.pos >= this.tokens.length;
    }

    peek() {
        return this.tokens[this.pos];
    }

    next() {
        return this.tokens[this.pos++];
    }

    parseExpression() {
        let left = this.parseTerm();
        while (this.peek()?.type === 'op' && (this.peek().value === '+' || this.peek().value === '-')) {
            const op = this.next().value;
            const right = this.parseTerm();
            left = op === '+' ? left + right : left - right;
        }
        return left;
    }

    parseTerm() {
        let left = this.parsePower();
        while (this.peek()?.type === 'op' && (this.peek().value === '*' || this.peek().value === '/')) {
            const op = this.next().value;
            const right = this.parsePower();
            left = op === '*' ? left * right : left / right;
        }
        return left;
    }

    parsePower() {
        const base = this.parseFactor();
        if (this.peek()?.type === 'op' && this.peek().value === '^') {
            this.next();
            return Math.pow(base, this.parsePower());
        }
        return base;
    }

    parseFactor() {
        const token = this.peek();
        if (!token) throw new Error('Unexpected end');

        if (token.type === 'op' && token.value === '-') {
            this.next();
            return -this.parseFactor();
        }
        if (token.type === 'op' && token.value === '+') {
            this.next();
            return this.parseFactor();
        }
        if (token.type === 'op' && token.value === '(') {
            this.next();
            const val = this.parseExpression();
            if (this.peek()?.value !== ')') throw new Error('Missing )');
            this.next();
            return this.parsePostfix(val);
        }
        if (token.type === 'num') {
            this.next();
            return this.parsePostfix(token.value);
        }
        throw new Error('Unexpected token');
    }

    parsePostfix(val) {
        while (this.peek()?.type === 'op' && this.peek().value === '%') {
            this.next();
            val = val / 100;
        }
        return val;
    }
}

export default Calculator;