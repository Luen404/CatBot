const Deck = require("./Deck");
const Dealer = require("./Dealer");
const Player = require("./Player");
const {
    resolveResult,
    calculatePot,
    calculateWinnings
} = require("./ResultCalculator");

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

        return ;
    }
    startGame(channelId) {
    const game = this.games.get(channelId);
    if (!game || game.started) return false;
    if (game.players.size === 0) return false;

    game.started = true;

    game.turnOrder = Array.from(game.players.keys());
    game.currentTurnIndex = 0;

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
        if (!player || player.stand || player.bust || player.die) return false;

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
        if (!player || player.die) return false;

        player.setStand();
        return true;
    }

    playerDie(channelId, userId) {
        const game = this.games.get(channelId);
        if (!game || !game.started) return false;

        const player = game.players.get(userId);
        if (!player) return false;

        player.die = true;
        player.stand = true;

        return true;
    }

    isRoundFinished(channelId) {
        const game = this.games.get(channelId);
        if (!game) return false;

        for (const player of game.players.values()) {
            if (!player.stand && !player.bust && !player.die) {
                return false;
            }
        }

        return true;
    }

    finishGame(channelId) {
        const game = this.games.get(channelId);
        if (!game) return null;

        // 딜러 자동 진행
        game.dealer.play(game.deck);

        const pot = calculatePot(game.players);

        let winnerId = null;
        let bestScore = -1;

        // 승자 판정
        for (const player of game.players.values()) {
            const result = resolveResult(player, game.dealer);
            player.result = result;

            if (player.die) continue;

            if (result === "player") {
                if (player.total > bestScore) {
                    bestScore = player.total;
                    winnerId = player.id;
                }
            }
        }

        const dealerWin = winnerId === null;

        const results = calculateWinnings(
            game.players,
            winnerId,
            pot,
            dealerWin
        );

        this.games.delete(channelId);

        return {
            dealer: game.dealer,
            results,
            pot,
            winnerId: dealerWin ? "dealer" : winnerId
        };
    }
}

module.exports = new GameManager();
