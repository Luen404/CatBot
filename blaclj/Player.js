
class Player {
    constructor(user, bet) {
        this.user = user;
        this.bet = bet;

        this.cards = [];

        this.stand = false;
        this.bust = false;
        this.surrender = false;
        this.doubleDown = false;

        this.finished = false;
    }

    addCard(card) {
        this.cards.push(card);

        if (this.getScore() > 21) {
            this.bust = true;
            this.finished = true;
        }
    }

    getScore() {
        let total = 0;
        let ace = 0;

        for (const card of this.cards) {
            total += card.getValue();

            if (card.rank === "A") {
                ace++;
            }
        }

        while (total > 21 && ace > 0) {
            total -= 10;
            ace--;
        }

        return total;
    }

    getHighestSuit() {
        let highest = 0;

        for (const card of this.cards) {
            if (card.getSuitPriority() > highest) {
                highest = card.getSuitPriority();
            }
        }

        return highest;
    }

    hit(card) {
        if (this.finished) return;

        this.addCard(card);
    }

    setStand() {
        this.stand = true;
        this.finished = true;
    }

    surrenderGame() {
        this.surrender = true;
        this.finished = true;
    }

    double() {
        this.bet *= 2;
        this.doubleDown = true;
    }

    canPlay() {
        return !this.finished;
    }

    hasBlackjack() {
        return this.cards.length === 2 && this.getScore() === 21;
    }

    getCardsString() {
        return this.cards
            .map(card => card.display())
            .join(" ");
    }

    reset() {
        this.cards = [];

        this.stand = false;
        this.bust = false;
        this.surrender = false;
        this.doubleDown = false;
        this.finished = false;
    }
}

module.exports = Player;
