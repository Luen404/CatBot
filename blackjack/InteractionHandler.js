const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const GameManager = require("./GameManager");
const EmbedBuilder = require("./EmbedBuilder");

class InteractionHandler {

    getGame(channelId) {
        return GameManager;
    }

    async createPanel(interaction) {
        GameManager.createGame(interaction.channelId);

        const joinBtn = new ButtonBuilder()
            .setCustomId("bj_join")
            .setLabel("JOIN")
            .setStyle(ButtonStyle.Success);

        const startBtn = new ButtonBuilder()
            .setCustomId("bj_start")
            .setLabel("START")
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(joinBtn, startBtn);

        return interaction.reply({
            embeds: [
                EmbedBuilder.simple("🎴 블랙잭\nJOIN으로 참가 후 START")
            ],
            components: [row]
        });
    }

    async handleButton(interaction) {
        const id = interaction.customId;
        const game = GameManager.getGame(interaction.channelId);

        if (!game) {
            return interaction.reply({ content: "게임이 없습니다.", ephemeral: true });
        }

        // ================= JOIN =================
        if (id === "bj_join") {
            game.joinGame(
                interaction.channelId,
                interaction.user.id,
                interaction.user.username,
                1000
            );

            return interaction.reply({
                content: "참가 완료",
                ephemeral: true
            });
        }

        // ================= START =================
        if (id === "bj_start") {
            game.startGame(interaction.channelId);

            const turn = game.getCurrentPlayer(interaction.channelId);

            const buttons = this.gameButtons();

            return interaction.update({
                embeds: [
                    EmbedBuilder.gameStatus(
                        this.buildStatus(game, interaction.channelId),
                        { currentPlayer: turn?.name }
                    )
                ],
                components: [buttons]
            });
        }

        // ================= ACTIONS =================
        if (id === "bj_hit") {
            game.playerHit(interaction.channelId, interaction.user.id);
        }

        if (id === "bj_stand") {
            game.playerStand(interaction.channelId, interaction.user.id);
        }

        if (id === "bj_die") {
            game.playerDie(interaction.channelId, interaction.user.id);
        }

        // ================= FINISH =================
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
            components: [this.gameButtons()]
        });
    }

    gameButtons() {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("bj_hit")
                .setLabel("HIT")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("bj_stand")
                .setLabel("STAND")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("bj_die")
                .setLabel("DIE")
                .setStyle(ButtonStyle.Danger)
        );
    }

    buildStatus(game, channelId) {
        const g = game.getGame(channelId);

        return {
            dealer: {
                hand: g.dealer.getHandString()
            },
            players: Array.from(g.players.values()).map(p => ({
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
