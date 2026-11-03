const DICTIONARY_RU_EN = {
    'привет': 'hello',
    'здравствуйте': 'hello',
    'доброе утро': 'good morning',
    'добрый день': 'good afternoon',
    'добрый вечер': 'good evening',
    'доброй ночи': 'good night',
    'пока': 'bye',
    'до свидания': 'goodbye',
    'спасибо': 'thank you',
    'пожалуйста': 'please',
    'извините': 'sorry',
    'как дела': 'how are you',
    'как ты': 'how are you',
    'что делаешь': 'what are you doing',
    'меня зовут': 'my name is',
    'я тебя люблю': 'I love you',
    'да': 'yes',
    'нет': 'no',
    'хорошо': 'good',
    'плохо': 'bad',
    'сегодня': 'today',
    'завтра': 'tomorrow',
    'вчера': 'yesterday',
    'время': 'time',
    'деньги': 'money',
    'работа': 'work',
    'дом': 'home',
    'город': 'city',
    'страна': 'country',
    'язык': 'language',
    'перевод': 'translation',
    'переводчик': 'translator',
    'поиск': 'search',
    'калькулятор': 'calculator',
    'рандомайзер': 'randomizer',
    'секундомер': 'stopwatch',
    'таймер': 'timer',
    'часы': 'clock',
    'настройки': 'settings',
    'музыка': 'music',
    'книга': 'book',
    'кошка': 'cat',
    'собака': 'dog',
    'вода': 'water',
    'еда': 'food',
    'хлеб': 'bread',
    'молоко': 'milk',
    'кофе': 'coffee',
    'чай': 'tea'
};

const DICTIONARY_EN_RU = (() => {
    const map = {};
    for (const [ru, en] of Object.entries(DICTIONARY_RU_EN)) {
        const key = en.toLowerCase();
        if (!map[key]) map[key] = ru;
    }
    return map;
})();

class Translator {
    static plan(text) {
        const raw = String(text || '').trim();
        if (!raw) return null;
        if (!/\p{L}/u.test(raw)) return null;
        if (/^(https?:\/\/|www\.)\S+$/i.test(raw)) return null;
        if (/^[\w-]+(\.[\w-]+)+$/.test(raw) && !/\s/.test(raw)) return null;

        const hasCyrillic = /[а-яё]/i.test(raw);
        const hasLatin = /[a-z]/i.test(raw);

        if (hasCyrillic) return { text: raw, from: 'ru', to: 'en' };
        if (hasLatin) return { text: raw, from: 'en', to: 'ru' };
        return null;
    }

    static async translate(text, from, to) {
        const key = `${from}|${to}|${text}`;
        const cached = this._cache.get(key);
        if (cached) return { ...cached, cached: true };

        const local = this._fromDictionary(text, from);
        if (local) {
            const result = { text: local, provider: 'dictionary' };
            this._remember(key, result);
            return { ...result, cached: false };
        }

        let result = null;
        let lastError = null;

        for (const provider of [this._google, this._myMemory]) {
            try {
                const translated = await provider.call(this, text, from, to);
                if (translated) {
                    result = { text: translated, provider: provider === this._google ? 'google' : 'mymemory' };
                    break;
                }
            } catch (err) {
                lastError = err;
            }
        }

        if (!result) {
            const err = new Error('Не удалось перевести текст');
            err.cause = lastError;
            throw err;
        }

        this._remember(key, result);
        return { ...result, cached: false };
    }

    static _remember(key, result) {
        if (this._cache.size >= 200) {
            const oldest = this._cache.keys().next().value;
            this._cache.delete(oldest);
        }
        this._cache.set(key, result);
    }

    static _fromDictionary(text, from) {
        const source = text.trim().toLowerCase().replace(/\s+/g, ' ');
        const map = from === 'ru' ? DICTIONARY_RU_EN : DICTIONARY_EN_RU;
        return map[source] || null;
    }

    static async _google(text, from, to) {
        const url = 'https://translate.googleapis.com/translate_a/single' +
            `?client=gtx&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}` +
            `&dt=t&q=${encodeURIComponent(text)}`;
        const data = await this._fetchJson(url);
        const parts = Array.isArray(data?.[0]) ? data[0] : [];
        const translated = parts.map(part => part?.[0] || '').join('').trim();
        if (!translated) throw new Error('Пустой ответ Google');
        return translated;
    }

    static async _myMemory(text, from, to) {
        const url = 'https://api.mymemory.translated.net/get' +
            `?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(`${from}|${to}`)}`;
        const data = await this._fetchJson(url);
        const translated = data?.responseData?.translatedText?.trim();
        if (!translated || Number(data?.responseStatus) !== 200) {
            throw new Error('Пустой ответ MyMemory');
        }
        return translated;
    }

    static async _fetchJson(url) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 7000);
        try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } finally {
            clearTimeout(timer);
        }
    }
}

Translator._cache = new Map();

export default Translator;
