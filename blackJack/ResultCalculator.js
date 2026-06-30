function calculateSuitWinner(cardA, cardB) {
    const order = {
        "♠": 4,
        "♦": 3,
        "♥": 2,
        "♣": 1
    };

    if (cardA.suit === cardB.suit) return 0;

    return order[cardA.suit] - order[cardB.suit];
}

function getBestCard(hand) {
    return hand.slice().sort((a, b) => {
        const suitDiff = calculateSuitWinner(a, b);
        if (suitDiff !== 0) return suitDiff;
        return b.getValue() - a.getValue();
    })[0];
}

function resolveResult(player, dealer) {
    if (player.bust && dealer.bust) return "dealer";
    if (player.bust) return "dealer";
    if (dealer.bust) return "player";

    if (player.total > dealer.total) return "player";
    if (player.total < dealer.total) return "dealer";

    const playerBest = getBestCard(player.hand);
    const dealerBest = getBestCard(dealer.hand);

    const suitCompare = calculateSuitWinner(playerBest, dealerBest);

    if (suitCompare > 0) return "player";
    if (suitCompare < 0) return "dealer";

    return "dealer";
}

function calculatePot(players) {
    let pot = 0;

    for (const p of players.values()) {
        pot += p.bet;
    }

    return pot;
}

function calculateWinnings(players, winnerId, pot) {
    const results = [];

    for (const p of players.values()) {
        if (p.id === winnerId) {
            results.push({
                id: p.id,
                name: p.name,
                result: "win",
                payout: pot
            });
        } else {
            results.push({
                id: p.id,
                name: p.name,
                result: "lose",
                payout: 0
            });
        }
    }

    return results;
}

module.exports = {
    resolveResult,
    calculatePot,
    calculateWinnings
};
