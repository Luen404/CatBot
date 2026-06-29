class GameManager {
    constructor() {
        this.games = new Map();
    }

    create(channelId, game) {
        if (this.games.has(channelId)) {
            return null;
        }

        this.games.set(channelId, game);

        return game;
    }

    get(channelId) {
        return this.games.get(channelId) ?? null;
    }

    has(channelId) {
        return this.games.has(channelId);
    }

    remove(channelId) {
        const game = this.games.get(channelId);

        if (!game) {
            return false;
        }

        if (typeof game.finish === "function") {
            game.finish();
        }

        this.games.delete(channelId);

        return true;
    }

    clear() {
        for (const game of this.games.values()) {
            if (typeof game.finish === "function") {
                game.finish();
            }
        }

        this.games.clear();
    }

    size() {
        return this.games.size;
    }

    values() {
        return [...this.games.values()];
    }

    keys() {
        return [...this.games.keys()];
    }
}

module.exports = new GameManager();
