const BlackjackGame = require("./BlackjackGame");

class InteractionHandler {
    constructor() {
        this.cooldowns = new Map();
    }

    getGame(channelId) {
        return new BlackjackGame(channelId);
    }

    create(interaction) {
        const game = this.getGame(interaction.channelId);
        const created = game.create();

        if (!created) {
            return interaction.reply({
                content: "이미 진행 중인 게임이 있습니다.",
                ephemeral: true
            });
        }

        return interaction.reply({
            content: "블랙잭 게임이 생성되었습니다. 참여하세요.",
            ephemeral: false
        });
    }

    join(interaction) {
        const bet = Number(interaction.options.get("bet").value);
        const game = this.getGame(interaction.channelId);

        const ok = game.join(
            interaction.user.id,
            interaction.user.username,
            bet
        );

        if (!ok) {
            return interaction.reply({
                content: "참여할 수 없습니다.",
                ephemeral: true
            });
        }

        return interaction.reply({
            content: `${interaction.user.username} 참가 완료 (${bet})`,
            ephemeral: false
        });
    }

    start(interaction) {
        const game = this.getGame(interaction.channelId);

        const ok = game.start();

        if (!ok) {
            return interaction.reply({
                content: "게임을 시작할 수 없습니다.",
                ephemeral: true
            });
        }

        return interaction.reply({
            content: "게임 시작!",
            ephemeral: false
        });
    }

    hit(interaction) {
        const game = this.getGame(interaction.channelId);

        const ok = game.hit(interaction.user.id);

        if (!ok) {
            return interaction.reply({
                content: "히트할 수 없습니다.",
                ephemeral: true
            });
        }

        return interaction.reply({
            content: `${interaction.user.username} 히트`,
            ephemeral: false
        });
    }

    stand(interaction) {
        const game = this.getGame(interaction.channelId);

        const ok = game.stand(interaction.user.id);

        if (!ok) {
            return interaction.reply({
                content: "스탠드할 수 없습니다.",
                ephemeral: true
            });
        }

        return interaction.reply({
            content: `${interaction.user.username} 스탠드`,
            ephemeral: false
        });
    }

    status(interaction) {
        const game = this.getGame(interaction.channelId);

        const status = game.status();

        if (!status) {
            return interaction.reply({
                content: "진행 중인 게임이 없습니다.",
                ephemeral: true
            });
        }

        let text = `🎴 블랙잭 상태\n\n`;

        for (const p of status.players) {
            text += `${p.name} | ${p.hand} | ${p.total}\n`;
        }

        text += `\n딜러: ${status.dealer.hand}`;

        return interaction.reply({
            content: text,
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
