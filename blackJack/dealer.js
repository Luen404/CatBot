
const Player = require("./Player");

class Dealer extends Player {
    constructor() {
        super(
            {
                id: "dealer",
                username: "Dealer"
            },
            0
        );

        this.hideFirstCard = true;
    }

    shouldHit() {
        return this.getScore() < 17;
    }

    reveal() {
        this.hideFirstCard = false;
    }

    hide() {
        this.hideFirstCard = true;
    }

    getVisibleCardsString() {
        return this.cards
            .map((card, index) => {
                if (index === 0 && this.hideFirstCard) {
                    return "`🂠`";
                }

                return card.display();
            })
            .join(" ");
    }

    getVisibleScore() {
        if (!this.hideFirstCard) {
            return this.getScore();
        }

        if (this.cards.length <= 1) {
            return "?";
        }

        const visibleCards = this.cards.slice(1);

        let total = 0;
        let ace = 0;

        for (const card of visibleCards) {
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

    reset() {
        super.reset();
        this.hideFirstCard = true;
    }
}

module.exports = Dealer;
