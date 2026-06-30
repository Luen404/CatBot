class Player {
    constructor(id, name, bet = 0) {
        this.id = id;
        this.name = name;
        this.bet = bet;
        this.hand = [];
        this.stand = false;
        this.bust = false;
        this.result = null;
        this.total = 0;
        this.die = false;
    }

    addCard(card) {
        this.hand.push(card);
        this.calculateTotal();
        if (this.total > 21) {
            this.bust = true;
        }
    }

    calculateTotal() {
        let total = 0;
        let aces = 0;

        for (const card of this.hand) {
            total += card.getValue();
            if (card.rank === "A") aces++;
        }

        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }

        this.total = total;
    }
    
    setDie() {
    this.die = true;
    }

    setStand() {
        this.stand = true;
    }

    reset() {
        this.hand = [];
        this.stand = false;
        this.bust = false;
        this.result = null;
        this.total = 0;
    }

    getHandString() {
        return this.hand.map(c => c.toString()).join(" ");
    }
}

module.exports = Player;
