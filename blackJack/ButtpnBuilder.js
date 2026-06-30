const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

class BlackjackButtonBuilder {
    static gameButtons() {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("bj_hit")
                .setLabel("HIT")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("bj_stand")
                .setLabel("STAND")
                .setStyle(ButtonStyle.Danger)
        );
    }

    static startButton() {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("bj_start")
                .setLabel("START")
                .setStyle(ButtonStyle.Success)
        );
    }

    static joinButton() {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("bj_join")
                .setLabel("JOIN")
                .setStyle(ButtonStyle.Primary)
        );
    }

    static endButton() {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("bj_end")
                .setLabel("END")
                .setStyle(ButtonStyle.Secondary)
        );
    }
}

module.exports = BlackjackButtonBuilder;
