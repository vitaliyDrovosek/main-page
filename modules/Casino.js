class Casino {
    constructor(app) {
        this.app = app;

        this.overlay = null;
        this.balanceEl = null;
        this.gameNameEl = null;
        this.betInput = null;
        this.slotsPanel = null;
        this.blackjackPanel = null;
        this.reels = [];
        this.slotsMessageEl = null;
        this.spinBtn = null;
        this.playerHandEl = null;
        this.dealerHandEl = null;
        this.playerScoreEl = null;
        this.dealerScoreEl = null;
        this.bjMessageEl = null;
        this.dealBtn = null;
        this.hitBtn = null;
        this.standBtn = null;
        this.dropdownBalanceEl = null;

        this.currentGame = 'slots';
        this.spinning = false;

        this.SYMBOLS = [
            { id: 'seven', label: '7', multiplier: 50 },
            { id: 'diamond', label: '♦', multiplier: 22 },
            { id: 'star', label: '★', multiplier: 15 },
            { id: 'clover', label: '♣', multiplier: 10 },
            { id: 'heart', label: '♥', multiplier: 8 },
            { id: 'bar', label: 'BAR', multiplier: 6 }
        ];
        this.PAIR_MULTIPLIER = 1.2;

        // Дилер добирает до 20, а не до 17: это заметно повышает шанс игрока
        // на победу и делает виртуальную игру щедрее классического блэкджека.
        this.BLACKJACK_DEALER_STAND = 20;

        this._timeouts = new Set();
        this._intervals = new Set();

        this.bjDeck = [];
        this.bjPlayer = [];
        this.bjDealer = [];
        this.bjState = 'idle';
        this.bjBet = 0;
        this.bjHoleHidden = false;
        this.bjNatural = false;

        this._initialized = false;
        this.boundKeyHandler = this.handleKey.bind(this);
    }

    init() {
        if (this._initialized) return;
        this._initialized = true;

        this.overlay = document.getElementById('casinoOverlay');
        if (!this.overlay) return;

        this.balanceEl = document.getElementById('casinoBalance');
        this.gameNameEl = document.getElementById('casinoGameName');
        this.betInput = document.getElementById('casinoBetInput');
        this.slotsPanel = document.getElementById('casinoSlotsPanel');
        this.blackjackPanel = document.getElementById('casinoBlackjackPanel');
        this.slotsMessageEl = document.getElementById('casinoSlotsMessage');
        this.spinBtn = document.getElementById('casinoSpinBtn');
        this.playerHandEl = document.getElementById('casinoPlayerHand');
        this.dealerHandEl = document.getElementById('casinoDealerHand');
        this.playerScoreEl = document.getElementById('casinoPlayerScore');
        this.dealerScoreEl = document.getElementById('casinoDealerScore');
        this.bjMessageEl = document.getElementById('casinoBjMessage');
        this.dealBtn = document.getElementById('casinoDealBtn');
        this.hitBtn = document.getElementById('casinoHitBtn');
        this.standBtn = document.getElementById('casinoStandBtn');
        this.dropdownBalanceEl = document.getElementById('casinoBalanceIndicator');
        this.reels = Array.from(document.querySelectorAll('#casinoReels .casino-reel'));

        document.getElementById('casinoCloseBtn')?.addEventListener('click', () => this.close());
        document.getElementById('casinoTabSlots')?.addEventListener('click', () => this.switchGame('slots'));
        document.getElementById('casinoTabBlackjack')?.addEventListener('click', () => this.switchGame('blackjack'));

        document.querySelectorAll('.casino-chip[data-bet]').forEach((btn) => {
            btn.addEventListener('click', () => this.applyChip(btn.dataset.bet));
        });

        document.getElementById('casinoTopUpBtn')?.addEventListener('click', () => this.topUp());

        this.spinBtn?.addEventListener('click', () => this.spinSlots());
        this.dealBtn?.addEventListener('click', () => this.dealBlackjack());
        this.hitBtn?.addEventListener('click', () => this.hit());
        this.standBtn?.addEventListener('click', () => this.stand());

        const savedBet = Number(this.app.data.casinoBet);
        if (Number.isFinite(savedBet) && savedBet > 0) {
            this.betInput.value = Math.floor(savedBet);
        }

        this._renderBalance();
        this._renderBet();
        this.switchGame('slots');
        this._renderHands();
        this._setBjButtons(false);
        this.updateDropdownBalance();
    }

    // ---------- Открытие / закрытие ----------

    open() {
        if (!this.overlay) return;
        this._renderBalance();
        this._renderHands();
        this.overlay.classList.add('visible');
        document.addEventListener('keydown', this.boundKeyHandler);
        this.updateDropdownBalance();
    }

    close() {
        this.overlay?.classList.remove('visible');
        document.removeEventListener('keydown', this.boundKeyHandler);
        this.app.storage?.save();
    }

    handleKey(e) {
        if (e.key === 'Escape') this.close();
    }

    // ---------- Баланс и ставка ----------

    formatMoney(value) {
        const n = Math.max(0, Math.round(Number(value) || 0));
        return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    getBalance() {
        const value = Number(this.app.data.casinoBalance);
        return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 1000;
    }

    setBalance(value) {
        this.app.data.casinoBalance = Math.max(0, Math.round(value));
        this._renderBalance();
    }

    _addBalance(value) {
        this.setBalance(this.getBalance() + value);
    }

    _renderBalance() {
        const balance = this.getBalance();
        if (this.balanceEl) this.balanceEl.textContent = this.formatMoney(balance);
        if (this.betInput) this.betInput.max = String(Math.max(1, balance));
    }

    _renderBet() {
        if (!this.betInput) return;
        const bet = this.getBet();
        this.betInput.value = String(bet);
        this.app.data.casinoBet = bet;
    }

    getBet() {
        const raw = Math.floor(Number(this.betInput?.value));
        if (!Number.isFinite(raw) || raw <= 0) return 0;
        return raw;
    }

    applyChip(kind) {
        if (!this.betInput) return;
        if (kind === 'all') {
            this.betInput.value = String(this.getBalance());
        } else {
            const amount = Number(kind);
            if (Number.isFinite(amount) && amount > 0) this.betInput.value = String(amount);
        }
        this._renderBet();
    }

    topUp() {
        this._addBalance(1000);
        this.app.storage?.save();
    }

    /**
     * Проверяет ставку и сразу списывает её с баланса.
     * Возвращает размер ставки или 0, если играть нельзя.
     */
    _takeBet(messageEl) {
        const bet = this.getBet();
        if (bet <= 0) {
            this._setMessage(messageEl, 'Введите ставку больше нуля.', 'lose');
            return 0;
        }
        const balance = this.getBalance();
        if (bet > balance) {
            this._setMessage(messageEl, 'Недостаточно фишек. Уменьшите ставку или пополните баланс.', 'lose');
            return 0;
        }

        this.app.data.casinoBet = bet;
        this.setBalance(balance - bet);
        return bet;
    }

    updateDropdownBalance() {
        if (!this.dropdownBalanceEl) return;
        this.dropdownBalanceEl.textContent = this.formatMoney(this.getBalance());
    }

    // ---------- Вкладки ----------

    switchGame(game) {
        if (game !== 'slots' && game !== 'blackjack') return;
        this.currentGame = game;

        const isSlots = game === 'slots';
        this.slotsPanel?.classList.toggle('active', isSlots);
        this.blackjackPanel?.classList.toggle('active', !isSlots);

        document.getElementById('casinoTabSlots')?.classList.toggle('active', isSlots);
        document.getElementById('casinoTabBlackjack')?.classList.toggle('active', !isSlots);
        document.getElementById('casinoTabSlots')?.setAttribute('aria-selected', String(isSlots));
        document.getElementById('casinoTabBlackjack')?.setAttribute('aria-selected', String(!isSlots));

        if (this.gameNameEl) this.gameNameEl.textContent = isSlots ? 'Слоты' : 'Блэкджек';
    }

    _setMessage(el, text, kind = '') {
        if (!el) return;
        el.textContent = text;
        el.classList.remove('win', 'lose', 'push');
        if (kind) el.classList.add(kind);
    }

    // ---------- Слоты ----------

    _randomSymbol() {
        return this.SYMBOLS[Math.floor(Math.random() * this.SYMBOLS.length)];
    }

    _setReel(reel, symbol) {
        if (!reel) return;
        const el = reel.querySelector('.casino-symbol');
        if (!el) return;
        el.textContent = symbol.label;
        el.dataset.symbol = symbol.id;
        reel.classList.toggle('bar', symbol.id === 'bar');
    }

    spinSlots() {
        if (this.spinning) return;
        if (!this.slotsMessageEl) return;

        const bet = this._takeBet(this.slotsMessageEl);
        if (!bet) return;

        this.spinning = true;
        if (this.spinBtn) this.spinBtn.disabled = true;
        this.reels.forEach((reel) => reel.classList.remove('winning'));
        this._setMessage(this.slotsMessageEl, 'Барабаны крутятся…');

        const result = [this._randomSymbol(), this._randomSymbol(), this._randomSymbol()];
        const stops = [620, 920, 1260];

        this.reels.forEach((reel, index) => {
            const interval = setInterval(() => {
                this._setReel(reel, this._randomSymbol());
            }, 70 + index * 15);
            this._intervals.add(interval);

            this._later(() => {
                clearInterval(interval);
                this._intervals.delete(interval);
                this._setReel(reel, result[index]);

                if (index === this.reels.length - 1) {
                    this._finishSlots(result, bet);
                }
            }, stops[index] || 1200);
        });
    }

    _finishSlots(symbols, bet) {
        const ids = symbols.map((s) => s.id);
        const triple = ids[0] === ids[1] && ids[1] === ids[2];
        const pair = !triple && (ids[0] === ids[1] || ids[1] === ids[2] || ids[0] === ids[2]);

        let multiplier = 0;
        if (triple) {
            multiplier = symbols[0].multiplier;
        } else if (pair) {
            multiplier = this.PAIR_MULTIPLIER;
        }

        const payout = Math.round(bet * multiplier);
        const net = payout - bet;
        if (payout > 0) this._addBalance(payout);

        if (triple) {
            this.reels.forEach((reel) => reel.classList.add('winning'));
        }

        if (payout > 0) {
            const label = triple ? `Три ${symbols[0].label}!` : 'Пара';
            this._setMessage(
                this.slotsMessageEl,
                `${label} — выигрыш ${this.formatMoney(payout)} (${multiplier === this.PAIR_MULTIPLIER ? 'x1.2' : `x${multiplier}`})`,
                net > 0 ? 'win' : 'push'
            );
        } else {
            this._setMessage(this.slotsMessageEl, 'Не повезло. Ставка ушла в кассу.', 'lose');
        }

        this.spinning = false;
        if (this.spinBtn) this.spinBtn.disabled = false;

        this.app.achievements?.trackCasinoRound({
            game: 'slots',
            bet,
            payout,
            net,
            balance: this.getBalance(),
            triple,
            symbols: ids,
            blackjack: false
        });

        this.app.storage?.save();
        this.updateDropdownBalance();
    }

    // ---------- Блэкджек ----------

    _newDeck() {
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const suits = ['♠', '♥', '♦', '♣'];
        const deck = [];
        for (const suit of suits) {
            for (const rank of ranks) deck.push({ rank, suit });
        }
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    _drawCard() {
        if (this.bjDeck.length === 0) this.bjDeck = this._newDeck();
        return this.bjDeck.pop();
    }

    _cardPoints(card) {
        if (!card) return 0;
        if (card.rank === 'A') return 11;
        if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return 10;
        return Number(card.rank);
    }

    _handValue(hand) {
        let total = hand.reduce((sum, card) => sum + this._cardPoints(card), 0);
        let aces = hand.filter((card) => card.rank === 'A').length;
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }
        return { total, soft: aces > 0 };
    }

    _cardEl(card, hidden = false) {
        const el = document.createElement('div');
        el.className = 'casino-card';
        if (hidden) {
            el.classList.add('back');
            return el;
        }
        if (card.suit === '♥' || card.suit === '♦') el.classList.add('red');

        const rank = document.createElement('span');
        rank.className = 'casino-card-rank';
        rank.textContent = card.rank;

        const suit = document.createElement('span');
        suit.className = 'casino-card-suit';
        suit.textContent = card.suit;

        el.append(rank, suit);
        return el;
    }

    _renderHand(container, hand, hideHole) {
        if (!container) return;
        const fragment = document.createDocumentFragment();
        hand.forEach((card, index) => {
            fragment.appendChild(this._cardEl(card, hideHole && index === 1));
        });
        container.replaceChildren(fragment);
    }

    _renderHands() {
        const hideHole = this.bjState === 'player' && this.bjHoleHidden;
        this._renderHand(this.playerHandEl, this.bjPlayer, false);
        this._renderHand(this.dealerHandEl, this.bjDealer, hideHole);

        const player = this._handValue(this.bjPlayer);
        const visibleDealer = hideHole ? this.bjDealer.slice(0, 1) : this.bjDealer;
        const dealer = this._handValue(visibleDealer);

        if (this.playerScoreEl) {
            this.playerScoreEl.textContent = this.bjPlayer.length ? String(player.total) : '';
            this.playerScoreEl.classList.toggle('bust', player.total > 21);
        }
        if (this.dealerScoreEl) {
            this.dealerScoreEl.textContent = this.bjDealer.length ? String(dealer.total) : '';
            this.dealerScoreEl.classList.toggle('bust', !hideHole && dealer.total > 21);
        }
    }

    _setBjButtons(active) {
        if (this.dealBtn) this.dealBtn.disabled = active;
        if (this.hitBtn) this.hitBtn.disabled = !active;
        if (this.standBtn) this.standBtn.disabled = !active;
    }

    dealBlackjack() {
        if (this.bjState === 'player' || this.bjState === 'dealer') return;
        if (!this.bjMessageEl) return;

        const bet = this._takeBet(this.bjMessageEl);
        if (!bet) return;

        this.bjBet = bet;
        this.bjDeck = this._newDeck();
        this.bjPlayer = [this._drawCard(), this._drawCard()];
        this.bjDealer = [this._drawCard(), this._drawCard()];
        this.bjState = 'player';
        this.bjHoleHidden = true;

        const player = this._handValue(this.bjPlayer);
        const dealer = this._handValue(this.bjDealer);
        this.bjNatural = player.total === 21;

        this._renderHands();
        this._setBjButtons(true);
        this._setMessage(this.bjMessageEl, 'Ваш ход: «Ещё» или «Хватит».');

        if (this.bjNatural || dealer.total === 21) {
            this.bjState = 'dealer';
            this.bjHoleHidden = false;
            this._renderHands();
            this._settleBlackjack(true);
        }
    }

    hit() {
        if (this.bjState !== 'player') return;

        this.bjPlayer.push(this._drawCard());
        const player = this._handValue(this.bjPlayer);
        this._renderHands();

        if (player.total > 21) {
            this.bjState = 'dealer';
            this.bjHoleHidden = false;
            this._renderHands();
            this._settleBlackjack(false);
            return;
        }

        if (player.total === 21) {
            this.stand();
        }
    }

    stand() {
        if (this.bjState !== 'player') return;
        this.bjState = 'dealer';
        this.bjHoleHidden = false;
        this._renderHands();
        this._dealerStep();
    }

    _dealerStep() {
        if (this.bjState !== 'dealer') return;
        const dealer = this._handValue(this.bjDealer);

        if (dealer.total < this.BLACKJACK_DEALER_STAND) {
            this.bjDealer.push(this._drawCard());
            this._renderHands();
            this._later(() => this._dealerStep(), 420);
            return;
        }

        this._settleBlackjack(false);
    }

    _settleBlackjack(naturalCheck) {
        const player = this._handValue(this.bjPlayer);
        const dealer = this._handValue(this.bjDealer);
        const bet = this.bjBet;

        const playerNatural = this.bjPlayer.length === 2 && player.total === 21;
        const dealerNatural = this.bjDealer.length === 2 && dealer.total === 21;

        let payout = 0;
        let message = '';
        let kind = '';

        if (player.total > 21) {
            message = `Перебор (${player.total}). Ставка сгорела.`;
            kind = 'lose';
        } else if (playerNatural || dealerNatural) {
            if (playerNatural && dealerNatural) {
                payout = bet;
                message = 'У обоих блэкджек — ничья.';
                kind = 'push';
            } else if (playerNatural) {
                payout = Math.round(bet * 2.5);
                message = `Блэкджек! Выигрыш ${this.formatMoney(payout)} (x2.5).`;
                kind = 'win';
            } else {
                message = 'У дилера блэкджек. Ставка сгорела.';
                kind = 'lose';
            }
        } else if (dealer.total > 21) {
            payout = bet * 2;
            message = `У дилера перебор (${dealer.total}). Выигрыш ${this.formatMoney(payout)}.`;
            kind = 'win';
        } else if (player.total > dealer.total) {
            payout = bet * 2;
            message = `Вы выиграли ${this.formatMoney(payout)} (${player.total} против ${dealer.total}).`;
            kind = 'win';
        } else if (player.total === dealer.total) {
            payout = bet;
            message = `Ничья ${player.total}:${dealer.total}. Ставка возвращена.`;
            kind = 'push';
        } else {
            message = `Дилер сильнее (${dealer.total} против ${player.total}).`;
            kind = 'lose';
        }

        if (payout > 0) this._addBalance(payout);
        const net = payout - bet;

        this.bjState = 'done';
        this.bjHoleHidden = false;
        this._renderHands();
        this._setBjButtons(false);
        this._setMessage(this.bjMessageEl, message, kind);

        this.app.achievements?.trackCasinoRound({
            game: 'blackjack',
            bet,
            payout,
            net,
            balance: this.getBalance(),
            blackjack: !!naturalCheck && playerNatural && !dealerNatural,
            triple: false,
            symbols: [],
            playerTotal: player.total,
            dealerTotal: dealer.total
        });

        this.app.storage?.save();
        this.updateDropdownBalance();
    }

    // ---------- Таймеры ----------

    _later(fn, delay) {
        const id = setTimeout(() => {
            this._timeouts.delete(id);
            fn();
        }, delay);
        this._timeouts.add(id);
        return id;
    }
}

export default Casino;
