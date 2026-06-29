class TurnManager {
    constructor(game) {
        this.game = game;

        this.turnTime = 30000;
        this.timeout = null;
    }

    getCurrentPlayer() {
        return this.game.getCurrentPlayer();
    }

    start() {
        if (!this.game.players.length) {
            return false;
        }

        this.game.resetTurns();

        const player = this.game.nextPlayer();

        if (!player) {
            return false;
        }

        this.startTimer();

        return true;
    }

    startTimer() {
        this.stopTimer();

        this.timeout = setTimeout(() => {
            this.autoStand();
        }, this.turnTime);
    }

    stopTimer() {
        if (!this.timeout) {
            return;
        }

        clearTimeout(this.timeout);
        this.timeout = null;
    }

    autoStand() {
        const player = this.getCurrentPlayer();

        if (!player) {
            return;
        }

        player.standTurn();

        this.next();
    }

    next() {
        this.stopTimer();

        const player = this.game.nextPlayer();

        if (!player) {
            this.game.dealer.reveal();
            return false;
        }

        this.startTimer();

        return true;
    }
}

module.exports = TurnManager;
