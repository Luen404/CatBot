const Deck = require("./Deck");
const Dealer = require("./Dealer");

class Game {
    constructor(host, bet) {
        this.host = host;
        this.bet = bet;

        this.deck = new Deck();
        this.dealer = new Dealer();

        this.players = [];

        this.started = false;
        this.finished = false;

        this.turnIndex = -1;

        this.createdAt = Date.now();
        this.startedAt = null;
        this.endedAt = null;
    }

    addPlayer(player) {
        if (this.started) return false;
        if (this.players.length >= 4) return false;
        if (this.players.some(p => p.user.id === player.user.id)) return false;

        this.players.push(player);
        return true;
    }

    removePlayer(userId) {
        if (this.started) return false;

        const index = this.players.findIndex(
            p => p.user.id === userId
        );

        if (index === -1) return false;

        this.players.splice(index, 1);

        return true;
    }

    getPlayer(userId) {
        return this.players.find(
            p => p.user.id === userId
        ) ?? null;
    }

    getPlayers() {
        return [...this.players];
    }

    getPlayerCount() {
        return this.players.length;
    }

    isHost(userId) {
        return this.host.id === userId;
    }

    isStarted() {
        return this.started;
    }

    isFinished() {
        return this.finished;
    }

    canStart() {
        return !this.started && this.players.length > 0;
    }

    start() {
        if (!this.canStart()) return false;

        this.started = true;
        this.startedAt = Date.now();

        return true;
    }

    finish() {
        this.finished = true;
        this.endedAt = Date.now();
    }

    resetTurns() {
        this.turnIndex = -1;

        for (const player of this.players) {
            player.turn = false;
        }
    }

    getCurrentPlayer() {
        if (this.turnIndex < 0) return null;

        return this.players[this.turnIndex] ?? null;
    }

    nextPlayer() {
        if (!this.players.length) return null;

        if (this.turnIndex >= 0 && this.players[this.turnIndex]) {
            this.players[this.turnIndex].endTurn();
        }

        do {
            this.turnIndex++;
        } while (
            this.turnIndex < this.players.length &&
            this.players[this.turnIndex].finished
        );

        if (this.turnIndex >= this.players.length) {
            return null;
        }

        this.players[this.turnIndex].startTurn();

        return this.players[this.turnIndex];
    }
}

module.exports = Game;

startGame() {
    if (this.started) {
        return false;
    }

    if (this.players.length <= 0) {
        return false;
    }

    this.started = true;
    this.startedAt = Date.now();

    this.deck.shuffle();

    for (const player of this.players) {
        player.reset();
    }

    this.dealer.reset();

    for (let i = 0; i < 2; i++) {
        for (const player of this.players) {
            player.addCard(this.deck.draw());
        }

        this.dealer.addCard(this.deck.draw());
    }

    this.turnIndex = 0;

    if (this.players.length > 0) {
        this.players[0].startTurn();
    }

    return true;
}

getDealer() {
    return this.dealer;
}

getDeck() {
    return this.deck;
}

getRemainingCards() {
    return this.deck.remaining();
}

isPlayerTurn(userId) {
    const player = this.getCurrentPlayer();

    if (!player) {
        return false;
    }

    return player.user.id === userId;
}

isLastPlayer() {
    return this.turnIndex >= this.players.length - 1;
}

hasFinishedPlayers() {
    return this.players.every(player => player.finished);
}

getAlivePlayers() {
    return this.players.filter(player => !player.bust);
}

getPlayingPlayers() {
    return this.players.filter(player => !player.finished);
}

getStandPlayers() {
    return this.players.filter(player => player.stand);
}

getBustPlayers() {
    return this.players.filter(player => player.bust);
}

getSurrenderPlayers() {
    return this.players.filter(player => player.surrender);
}

resetGame() {
    this.started = false;
    this.finished = false;

    this.turnIndex = -1;

    this.deck.reset();

    this.dealer.reset();

    for (const player of this.players) {
        player.reset();
    }
}
