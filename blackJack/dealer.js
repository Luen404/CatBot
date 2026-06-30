const Player = require("./Player");

class Dealer extends Player {
    constructor() {
        super("dealer", "Dealer", 0);
    }

    shouldHit() {
        return this.total < 17;
    }

    play(deck) {
        while (this.shouldHit()) {
            this.addCard(deck.draw());
        }
        this.setStand();
    }

    getVisibleHandString() {
        if (this.hand.length === 0) return "";
        return `${this.hand[0].toString()} ??`;
    }
}

module.exports = Dealer;
