function compareSuit(a, b) {
    const order = {
        "♠": 4,
        "♦": 3,
        "♥": 2,
        "♣": 1
    };

    return order[a.suit] - order[b.suit];
}

function compareHands(player, dealer) {
    if (player.bust && dealer.bust) return "dealer";
    if (player.bust) return "dealer";
    if (dealer.bust) return "player";

    if (player.total > dealer.total) return "player";
    if (player.total < dealer.total) return "dealer";

    const playerBest = player.hand
        .slice()
        .sort(compareSuit)[player.hand.length - 1];

    const dealerBest = dealer.hand
        .slice()
        .sort(compareSuit)[dealer.hand.length - 1];

    const suitDiff = compareSuit(playerBest, dealerBest);

    if (suitDiff > 0) return "player";
    if (suitDiff < 0) return "dealer";

    return "dealer";
}

function calculatePayout(player, result) {
    if (result === "player") {
        return player.bet * 2;
    }

    if (result === "dealer") {
        return Math.floor(player.bet * 0.5);
    }

    return player.bet;
}

module.exports = {
    compareHands,
    calculatePayout
};
