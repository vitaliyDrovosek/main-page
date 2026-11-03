/**
 * Генераторы случайных значений для виджета рандомайзера.
 * Модуль не трогает DOM — этим занимается RandomizerWidget.js.
 */
class Randomizer {
    static randomNumber(min, max) {
        let from = Math.ceil(Number(min));
        let to = Math.floor(Number(max));

        if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
        if (to < from) [from, to] = [to, from];
        if (to - from > 1e9) return null;

        const value = Math.floor(Math.random() * (to - from + 1)) + from;

        return {
            kind: 'number',
            value,
            label: 'Случайное число',
            detail: `${from} … ${to}`,
            min: from,
            max: to
        };
    }

    static rollDice(count = 1, sides = 6) {
        const safeCount = Math.min(20, Math.max(1, parseInt(count, 10) || 1));
        const safeSides = Math.min(1000, Math.max(2, parseInt(sides, 10) || 6));

        const rolls = [];
        let total = 0;
        for (let i = 0; i < safeCount; i++) {
            const roll = Math.floor(Math.random() * safeSides) + 1;
            rolls.push(roll);
            total += roll;
        }

        return {
            kind: 'dice',
            value: total,
            label: `Кубики · ${safeCount}d${safeSides}`,
            detail: rolls.join(' + ')
        };
    }

    static flipCoin() {
        return {
            kind: 'coin',
            value: Math.random() < 0.5 ? 'Орёл' : 'Решка',
            label: 'Монетка',
            detail: '50 / 50'
        };
    }
}

export default Randomizer;
