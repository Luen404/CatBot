const InteractionHandler = require("../blackjack/InteractionHandler");

module.exports = {
    name: "interactionCreate",
    async execute(interaction) {

        if (interaction.isButton()) {
            return InteractionHandler.handleButton(interaction);
        }

        if (interaction.isChatInputCommand()) {
            const cmd = interaction.client.commands.get(interaction.commandName);
            if (!cmd) return;
            return cmd.execute(interaction);
        }
    }
};
