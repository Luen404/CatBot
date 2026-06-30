class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
    }

    getValue() {
        if (["J", "Q", "K"].includes(this.rank)) return 10;
        if (this.rank === "A") return 11;
        return Number(this.rank);
    }

    getSuitPriority() {
        switch (this.suit) {
            case "♠":
                return 4;
            case "♦":
                return 3;
            case "♥":
                return 2;
            case "♣":
                return 1;
            default:
                return 0;
        }
    }

    toString() {
        return `${this.suit}${this.rank}`;
    }
}

module.exports = Card;
