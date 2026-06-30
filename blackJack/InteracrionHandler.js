const BlackjackGame = require("./BlackjackGame");
const EmbedBuilder = require("./EmbedBuilder");
const ButtonBuilder = require("./ButtonBuilder");

class InteractionHandler {
    getGame(channelId) {
        return new BlackjackGame(channelId);
    }

    async createPanel(interaction) {
        const game = this.getGame(interaction.channelId);

        const created = game.create();

        if (!created) {
            return interaction.reply({
                content: "이미 진행 중인 게임이 있습니다.",
                ephemeral: true
            });
        }

        return interaction.reply({
            embeds: [
                EmbedBuilder.simple("🎴 블랙잭 시작!\n\nJOIN 버튼으로 참가 후 START로 시작하세요.")
            ],
            components: [
                ButtonBuilder.joinButton(),
                ButtonBuilder.startButton()
            ]
        });
    }

    async handleButton(interaction) {
        const id = interaction.customId;
        const game = this.getGame(interaction.channelId);

        // JOIN
        if (id === "bj_join") {
            const ok = game.join(
                interaction.user.id,
                interaction.user.username,
                1000
            );

            if (!ok) {
                return interaction.reply({
                    content: "참가할 수 없습니다.",
                    ephemeral: true
                });
            }

            return interaction.reply({
                content: `${interaction.user.username} 참가 완료`,
                ephemeral: false
            });
        }

        // START
        if (id === "bj_start") {
            const ok = game.start();

            if (!ok) {
                return interaction.reply({
                    content: "게임을 시작할 수 없습니다.",
                    ephemeral: true
                });
            }

            const status = game.status();

            return interaction.update({
                embeds: [
                    EmbedBuilder.gameStatus(status)
                ],
                components: [
                    ButtonBuilder.gameButtons()
                ]
            });
        }

        // HIT
        if (id === "bj_hit") {
            await this.hit(interaction);
        }

        // STAND
        if (id === "bj_stand") {
            await this.stand(interaction);
        }

        // DIE
        if (id === "bj_die") {
            const gameInst = game.getGame(interaction.channelId);
            const player = gameInst.players.get(interaction.user.id);

            if (!player) {
                return interaction.reply({
                    content: "게임 참여자가 아닙니다.",
                    ephemeral: true
                });
            }

            player.die = true;
            player.stand = true;

            return interaction.reply({
                content: `${interaction.user.username} DIE (포기)`,
                ephemeral: false
            });
        }

        const finished = await this.finishIfReady(interaction);

        if (!finished) {
            const status = game.status();

            return interaction.update({
                embeds: [
                    EmbedBuilder.gameStatus(status)
                ],
                components: [
                    ButtonBuilder.gameButtons()
                ]
            });
        }
    }

    async hit(interaction) {
        const game = this.getGame(interaction.channelId);

        const ok = game.hit(interaction.user.id);

        if (!ok) {
            return interaction.reply({
                content: "HIT 불가",
                ephemeral: true
            });
        }

        return interaction.reply({
            content: `${interaction.user.username} HIT`,
            ephemeral: false
        });
    }

    async stand(interaction) {
        const game = this.getGame(interaction.channelId);

        const ok = game.stand(interaction.user.id);

        if (!ok) {
            return interaction.reply({
                content: "STAND 불가",
                ephemeral: true
            });
        }

        return interaction.reply({
            content: `${interaction.user.username} STAND`,
            ephemeral: false
        });
    }

    async finishIfReady(interaction) {
        const game = this.getGame(interaction.channelId);

        if (!game.isFinished()) return false;

        const result = game.finish();

        let text = `🏁 결과\n\n`;

        for (const r of result.results) {
            text += `${r.name} → ${r.result} (${r.payout})\n`;
        }

        text += `\n딜러: ${result.dealer.getHandString()}`;

        await interaction.followUp({
            content: text
        });

        return true;
    }
}

module.exports = new InteractionHandler();
