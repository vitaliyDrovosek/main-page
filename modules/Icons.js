/**
 * Локальные SVG-иконки.
 *
 * Сами символы лежат в SVG-спрайте в index.html, поэтому код ниже не тянет
 * ничего из сети. Модуль умеет отдавать готовую разметку для шаблонов и
 * создавать DOM-элемент для динамических кнопок.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function symbolId(name) {
    return `#i-${name}`;
}

export function iconMarkup(name, className = 'svg-icon') {
    return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="${symbolId(name)}"></use></svg>`;
}

export function createIcon(name, className = 'svg-icon') {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', className);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', symbolId(name));
    svg.appendChild(use);

    return svg;
}

export default { markup: iconMarkup, create: createIcon };
