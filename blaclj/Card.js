
class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
    }

    getValue() {
        if (this.rank === "A") return 11;

        if (["J", "Q", "K"].includes(this.rank)) {
            return 10;
        }

        return Number(this.rank);
    }

    getSuitPriority() {
        return {
            spade: 4,
            diamond: 3,
            heart: 2,
            club: 1
        }[this.suit] ?? 0;
    }

    getSuitSymbol() {
        return {
            spade: "♠",
            diamond: "♦",
            heart: "♥",
            club: "♣"
        }[this.suit] ?? "?";
    }

    toString() {
        return `${this.getSuitSymbol()}${this.rank}`;
    }

    display() {
        return `\`${this.getSuitSymbol()} ${this.rank}\``;
    }

    toJSON() {
        return {
            suit: this.suit,
            rank: this.rank
        };
    }

    static from(data) {
        return new Card(data.suit, data.rank);
    }
}

module.exports = Card;
