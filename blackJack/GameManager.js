const Deck = require("./Deck");
const Dealer = require("./Dealer");
const Player = require("./Player");
const { resolveResult, calculatePot, calculateWinnings } = require("./ResultCalculator");

class GameManager {
    constructor() {
        this.games = new Map();
    }

    createGame(channelId) {
        if (this.games.has(channelId)) return null;

        const game = {
            channelId,
            deck: new Deck(),
            dealer: new Dealer(),
            players: new Map(),
            started: false
        };

        this.games.set(channelId, game);
        return game;
    }

    getGame(channelId) {
        return this.games.get(channelId);
    }

    joinGame(channelId, userId, name, bet) {
        const game = this.games.get(channelId);
        if (!game || game.started) return false;
        if (game.players.size >= 4) return false;
        if (game.players.has(userId)) return false;

        const player = new Player(userId, name, bet);
        game.players.set(userId, player);

        return true;
    }

    startGame(channelId) {
        const game = this.games.get(channelId);
        if (!game || game.started) return false;
        if (game.players.size === 0) return false;

        game.started = true;

        for (const player of game.players.values()) {
            player.addCard(game.deck.draw());
            player.addCard(game.deck.draw());
        }

        game.dealer.addCard(game.deck.draw());
        game.dealer.addCard(game.deck.draw());

        return true;
    }

    playerHit(channelId, userId) {
        const game = this.games.get(channelId);
        if (!game || !game.started) return false;

        const player = game.players.get(userId);
        if (!player || player.stand || player.bust) return false;

        player.addCard(game.deck.draw());

        if (player.total >= 21) {
            player.setStand();
        }

        return true;
    }

    playerStand(channelId, userId) {
        const game = this.games.get(channelId);
        if (!game || !game.started) return false;

        const player = game.players.get(userId);
        if (!player) return false;

        player.setStand();
        return true;
    }

    isRoundFinished(channelId) {
        const game = this.games.get(channelId);
        if (!game) return false;

        for (const player of game.players.values()) {
            if (!player.stand && !player.bust) return false;
        }

        return true;
    }

    finishGame(channelId) {
        const game = this.games.get(channelId);
        if (!game) return null;

        game.dealer.play(game.deck);

        const pot = calculatePot(game.players);

        let winnerId = null;
        let bestScore = -1;

        for (const player of game.players.values()) {
            const result = resolveResult(player, game.dealer);

            player.result = result;

            if (result === "player") {
                if (player.total > bestScore) {
                    bestScore = player.total;
                    winnerId = player.id;
                }
            }
        }

        const results = calculateWinnings(game.players, winnerId, pot);

        const dealerWins = winnerId === null;

        if (dealerWins) {
            for (const p of game.players.values()) {
                results.push({
                    id: p.id,
                    name: p.name,
                    result: "lose",
                    payout: 0
                });
            }
        }

        this.games.delete(channelId);

        return {
            dealer: game.dealer,
            results,
            pot,
            winnerId: dealerWins ? "dealer" : winnerId
        };
    }
}

module.exports = new GameManager();
