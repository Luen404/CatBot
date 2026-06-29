class Player {
    constructor(user, bet) {
        this.user = user;
        this.bet = bet;
        this.cards = [];

        this.turn = false;
        this.firstTurn = true;

        this.finished = false;
        this.stand = false;
        this.bust = false;
        this.surrender = false;
        this.doubleDown = false;

        this.result = null;
        this.actionCount = 0;
    }

    addCard(card) {
        this.cards.push(card);

        if (this.getScore() > 21) {
            this.bust = true;
            this.finished = true;
            this.result = "bust";
        }
    }

    getScore() {
        let score = 0;
        let aces = 0;

        for (const card of this.cards) {
            score += card.getValue();

            if (card.rank === "A") {
                aces++;
            }
        }

        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }

        return score;
    }

    getHighestSuit() {
        let highest = 0;

        for (const card of this.cards) {
            highest = Math.max(highest, card.getSuitPriority());
        }

        return highest;
    }

    hit(card) {
        if (!this.canHit()) return false;

        this.addCard(card);
        this.firstTurn = false;
        this.actionCount++;

        return true;
    }

    standTurn() {
        if (!this.canStand()) return false;

        this.stand = true;
        this.finished = true;
        this.turn = false;
        this.firstTurn = false;
        this.actionCount++;

        return true;
    }

    surrenderTurn() {
        if (!this.canSurrender()) return false;

        this.surrender = true;
        this.finished = true;
        this.turn = false;
        this.firstTurn = false;
        this.result = "surrender";
        this.actionCount++;

        return true;
    }

    doubleDown() {
        if (!this.canDouble()) return false;

        this.bet *= 2;
        this.doubleDown = true;
        this.firstTurn = false;
        this.actionCount++;

        return true;
    }

    startTurn() {
        this.turn = true;
    }

    endTurn() {
        this.turn = false;
    }

    finish(result = null) {
        this.finished = true;
        this.turn = false;

        if (result) {
            this.result = result;
        }
    }

    canHit() {
        return !this.finished && !this.bust;
    }

    canStand() {
        return !this.finished;
    }

    canDouble() {
        return (
            !this.finished &&
            this.firstTurn &&
            !this.doubleDown &&
            this.cards.length === 2
        );
    }

    canSurrender() {
        return (
            !this.finished &&
            this.firstTurn &&
            this.cards.length === 2
        );
    }

    hasBlackjack() {
        return this.cards.length === 2 && this.getScore() === 21;
    }

    isBust() {
        return this.bust;
    }

    getCardsString() {
        return this.cards
            .map(card => card.display())
            .join(" ");
    }

    reset() {
        this.cards = [];

        this.turn = false;
        this.firstTurn = true;

        this.finished = false;
        this.stand = false;
        this.bust = false;
        this.surrender = false;
        this.doubleDown = false;

        this.result = null;
        this.actionCount = 0;
    }
}

module.exports = Player;
