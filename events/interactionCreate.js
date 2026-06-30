module.exports = {
    name: 'interactionCreate',

    async execute(interaction, client) {
        try {
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);

                if (!command) {
                    return interaction.reply({
                        content: '존재하지 않는 커맨드입니다.',
                        ephemeral: true,
                    });
                }

                try {
                    await command.execute(interaction, client);
                } catch (err) {
                    console.error(err);

                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({
                            content: '커맨드 실행 중 오류가 발생했습니다.',
                            ephemeral: true,
                        });
                    } else {
                        await interaction.reply({
                            content: '커맨드 실행 중 오류가 발생했습니다.',
                            ephemeral: true,
                        });
                    }
                }
            }

            if (interaction.isButton()) {
                const button = client.buttons?.get(interaction.customId);

                if (!button) return;

                try {
                    await button.execute(interaction, client);
                } catch (err) {
                    console.error(err);

                    await interaction.reply({
                        content: '버튼 처리 중 오류가 발생했습니다.',
                        ephemeral: true,
                    });
                }
            }

            if (interaction.isModalSubmit()) {
                const modal = client.modals?.get(interaction.customId);

                if (!modal) return;

                try {
                    await modal.execute(interaction, client);
                } catch (err) {
                    console.error(err);

                    await interaction.reply({
                        content: '모달 처리 중 오류가 발생했습니다.',
                        ephemeral: true,
                    });
                }
            }

            if (interaction.isStringSelectMenu()) {
                const select = client.selectMenus?.get(interaction.customId);

                if (!select) return;

                try {
                    await select.execute(interaction, client);
                } catch (err) {
                    console.error(err);

                    await interaction.reply({
                        content: '선택 메뉴 처리 중 오류가 발생했습니다.',
                        ephemeral: true,
                    });
                }
            }
        } catch (err) {
            console.error(err);
        }
    },
};
