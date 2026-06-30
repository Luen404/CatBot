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
            started: false,
            turnOrder: [],
            currentTurnIndex: 0
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

        game.started = true;

        game.turnOrder = Array.from(game.players.keys());
        game.currentTurnIndex = 0;

        for (const p of game.players.values()) {
            p.addCard(game.deck.draw());
            p.addCard(game.deck.draw());
        }

        game.dealer.addCard(game.deck.draw());
        game.dealer.addCard(game.deck.draw());

        return true;
    }

    getCurrentPlayer(channelId) {
        const game = this.games.get(channelId);
        if (!game) return null;

        const id = game.turnOrder[game.currentTurnIndex];
        return game.players.get(id) || null;
    }

    nextTurn(channelId) {
        const game = this.games.get(channelId);
        if (!game) return;

        const total = game.turnOrder.length;
        if (total === 0) return;

        let safety = 0;

        while (safety < total) {
            game.currentTurnIndex =
                (game.currentTurnIndex + 1) % total;

            const id = game.turnOrder[game.currentTurnIndex];
            const p = game.players.get(id);

            if (!p) {
                safety++;
                continue;
            }

            if (!p.die && !p.bust && !p.stand) {
                return;
            }

            safety++;
        }

        // 👉 모든 플레이어 종료 상태면 턴 종료
        game.currentTurnIndex = 0;
    }

    playerHit(channelId, userId) {
        const game = this.games.get(channelId);
        if (!game || !game.started) return false;

        if (game.turnOrder[game.currentTurnIndex] !== userId) return false;

        const player = game.players.get(userId);
        if (!player || player.stand || player.bust || player.die) return false;

        player.addCard(game.deck.draw());

        if (player.total > 21) {
            player.bust = true;
            player.stand = true;
            this.nextTurn(channelId);
            return true;
        }

        if (player.total === 21) {
            player.setStand();
            this.nextTurn(channelId);
            return true;
        }

        return true;
    }

    playerStand(channelId, userId) {
        const game = this.games.get(channelId);
        if (!game || !game.started) return false;

        if (game.turnOrder[game.currentTurnIndex] !== userId) return false;

        const player = game.players.get(userId);
        if (!player) return false;

        player.setStand();
        this.nextTurn(channelId);

        return true;
    }

    playerDie(channelId, userId) {
        const game = this.games.get(channelId);
        if (!game || !game.started) return false;

        if (game.turnOrder[game.currentTurnIndex] !== userId) return false;

        const player = game.players.get(userId);
        if (!player) return false;

        player.die = true;
        player.stand = true;

        this.nextTurn(channelId);

        return true;
    }

    isRoundFinished(channelId) {
        const game = this.games.get(channelId);
        if (!game) return false;

        return [...game.players.values()]
            .every(p => p.stand || p.bust || p.die);
    }

    finishGame(channelId) {
        const game = this.games.get(channelId);
        if (!game) return null;

        game.dealer.play(game.deck);

        const pot = calculatePot(game.players);

        let winnerId = null;
        let best = -1;

        for (const p of game.players.values()) {
            const result = resolveResult(p, game.dealer);
            p.result = result;

            if (p.die || p.bust) continue;

            if (result === "player" && p.total > best && p.total <= 21) {
                best = p.total;
                winnerId = p.id;
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
