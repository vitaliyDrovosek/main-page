
class DropdownSubgroups {
    constructor(app) {
        this.app = app;
        this._observer = null;
        this._groups = [];
        this._initialized = false;
    }

    init() {
        if (this._initialized) return;
        this._initialized = true;

        this._scan();
        this._observe();
        this.syncAll();
    }

    _scan() {
        this._groups = [];
        const subgroups = document.querySelectorAll('.dropdown-subgroup');

        for (const sg of subgroups) {
            const items = sg.querySelector('.dropdown-subgroup-items');
            if (!items) continue;

            
            let indicator = null;
            const parentId = sg.getAttribute('data-subgroup-parent');
            if (parentId) indicator = document.getElementById(parentId);

            
            if (!indicator) indicator = sg.querySelector('.toggle-indicator');

            if (!indicator) {
                console.warn('[DropdownSubgroups] нет индикатора для', sg);
                continue;
            }

            
            const invert = sg.getAttribute('data-subgroup-invert') === 'true';

            this._groups.push({ subgroup: sg, indicator, items, invert });
        }

        console.log(
            `[DropdownSubgroups] найдено групп: ${this._groups.length}`,
            this._groups.map(g => g.indicator.id + (g.invert ? ' (invert)' : ''))
        );
    }

    _observe() {
        if (this._observer) this._observer.disconnect();
        this._observer = new MutationObserver(() => this.syncAll());
        for (const { indicator } of this._groups) {
            this._observer.observe(indicator, {
                attributes: true,
                attributeFilter: ['class']
            });
        }
    }

    syncAll() {
        for (const g of this._groups) this._sync(g);
    }

    _sync({ subgroup, indicator, invert }) {
        const off = indicator.classList.contains('off');
        
        const collapsed = invert ? !off : off;
        subgroup.classList.toggle('collapsed', collapsed);
        
    }
}

export default DropdownSubgroups;