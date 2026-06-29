
const Card = require("./Card");

class Deck {
    constructor() {
        this.reset();
    }

    reset() {
        this.cards = [];

        const suits = [
            "spade",
            "diamond",
            "heart",
            "club"
        ];

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

        for (const suit of suits) {
            for (const rank of ranks) {
                this.cards.push(new Card(suit, rank));
            }
        }

        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            [this.cards[i], this.cards[j]] = [
                this.cards[j],
                this.cards[i]
            ];
        }

        return this;
    }

    draw() {
        if (this.cards.length <= 0) {
            this.reset();
        }

        return this.cards.pop();
    }

    drawMany(amount) {
        const result = [];

        for (let i = 0; i < amount; i++) {
            result.push(this.draw());
        }

        return result;
    }

    remaining() {
        return this.cards.length;
    }

    isEmpty() {
        return this.cards.length === 0;
    }

    peek() {
        return this.cards[this.cards.length - 1] ?? null;
    }

    add(card) {
        this.cards.unshift(card);
    }

    addMany(cards) {
        this.cards.unshift(...cards);
    }

    toJSON() {
        return this.cards.map(card => card.toJSON());
    }

    static from(data) {
        const deck = new Deck();

        deck.cards = data.map(Card.from);

        return deck;
    }
}

module.exports = Deck;
