const Card = require("./Card");

class Deck {
    constructor() {
        this.cards = [];
        this.create();
        this.shuffle();
    }

    create() {
        const suits = ["♠", "♦", "♥", "♣"];
        const ranks = [
            "A",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "J",
            "Q",
            "K"
        ];

        this.cards = [];

        for (const suit of suits) {
            for (const rank of ranks) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            [this.cards[i], this.cards[j]] = [
                this.cards[j],
                this.cards[i]
            ];
        }
    }

    draw() {
        if (!this.cards.length) {
            throw new Error("Deck is empty.");
        }

        return this.cards.pop();
    }

    remaining() {
        return this.cards.length;
    }

    reset() {
        this.create();
        this.shuffle();
    }
}

module.exports = Deck;
