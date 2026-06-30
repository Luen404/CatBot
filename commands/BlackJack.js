
const { SlashCommandBuilder } = require("discord.js");
const InteractionHandler = require("../blackjack/InteractionHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("블랙잭")
        .setDescription("블랙잭 게임 패널 생성"),

    async execute(interaction) {
        return InteractionHandler.createPanel(interaction);
    }
};
