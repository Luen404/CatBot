const GameManager = require("./GameManager");

class BlackjackGame {
    constructor(channel) {
        this.channel = channel;
    }

    create() {
        return GameManager.createGame(this.channel);
    }

    join(userId, name, bet) {
        return GameManager.joinGame(this.channel, userId, name, bet);
    }

    start() {
        return GameManager.startGame(this.channel);
    }

    hit(userId) {
        return GameManager.playerHit(this.channel, userId);
    }

    stand(userId) {
        return GameManager.playerStand(this.channel, userId);
    }

    status() {
        const game = GameManager.getGame(this.channel);
        if (!game) return null;

        return {
            started: game.started,
            players: Array.from(game.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                hand: p.getHandString(),
                total: p.total,
                stand: p.stand,
                bust: p.bust,
                bet: p.bet
            })),
            dealer: {
                hand: game.dealer.getVisibleHandString(),
                total: game.started ? game.dealer.total : null
            }
        };
    }

    isFinished() {
        return GameManager.isRoundFinished(this.channel);
    }

    finish() {
        return GameManager.finishGame(this.channel);
    }
}

module.exports = BlackjackGame;
