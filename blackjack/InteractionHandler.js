const GameManager = require("./GameManager");
const EmbedBuilder = require("./EmbedBuilder");
const ButtonBuilder = require("./ButtonBuilder");

class InteractionHandler {
    getGame(channelId) {
        return GameManager;
    }

    async createPanel(interaction) {
        GameManager.createGame(interaction.channelId);

        return interaction.reply({
            embeds: [
                EmbedBuilder.simple("🎴 블랙잭\nJOIN으로 참가 후 START")
            ],
            components: [
                ButtonBuilder.joinButton(),
                ButtonBuilder.startButton()
            ]
        });
    }

    async handleButton(interaction) {
        const id = interaction.customId;
        const game = GameManager.getGame(interaction.channelId);

        if (!game) return;

        if (id === "bj_join") {
            game.joinGame(
                interaction.channelId,
                interaction.user.id,
                interaction.user.username,
                1000
            );

            return interaction.reply({
                content: "참가 완료",
                ephemeral: false
            });
        }

        if (id === "bj_start") {
            game.startGame(interaction.channelId);

            const turn = game.getCurrentPlayer(interaction.channelId);

            return interaction.update({
                embeds: [
                    EmbedBuilder.gameStatus(
                        this.buildStatus(game, interaction.channelId),
                        { currentPlayer: turn?.name }
                    )
                ],
                components: [ButtonBuilder.gameButtons()]
            });
        }

        if (id === "bj_hit") {
            game.playerHit(interaction.channelId, interaction.user.id);
        }

        if (id === "bj_stand") {
            game.playerStand(interaction.channelId, interaction.user.id);
        }

        if (id === "bj_die") {
            game.playerDie(interaction.channelId, interaction.user.id);
        }

        if (game.isRoundFinished(interaction.channelId)) {
            const result = game.finishGame(interaction.channelId);

            return interaction.update({
                embeds: [
                    EmbedBuilder.result(result)
                ],
                components: []
            });
        }

        const turn = game.getCurrentPlayer(interaction.channelId);

        return interaction.update({
            embeds: [
                EmbedBuilder.gameStatus(
                    this.buildStatus(game, interaction.channelId),
                    { currentPlayer: turn?.name }
                )
            ],
            components: [ButtonBuilder.gameButtons()]
        });
    }

    buildStatus(game, channelId) {
        return {
            dealer: {
                hand: game.getGame(channelId).dealer.getHandString()
            },
            players: Array.from(game.getGame(channelId).players.values()).map(p => ({
                name: p.name,
                hand: p.getHandString(),
                total: p.total,
                bet: p.bet,
                die: p.die,
                bust: p.bust,
                stand: p.stand
            }))
        };
    }
}

module.exports = new InteractionHandler();
