const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'users.json');

function loadUserData() {
    try {
        if (!fs.existsSync(dbPath)) return {};
        return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    } catch {
        return {};
    }
}

function saveUserData(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function ensureUser(users, id) {
    if (!users[id]) {
        users[id] = { point: 0 };
        saveUserData(users);
    }
}

function createButtons(step, choice, bet) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('bet_-100').setLabel('-100').setStyle(ButtonStyle.Danger).setDisabled(step !== 'bet'),
            new ButtonBuilder().setCustomId('bet_-10').setLabel('-10').setStyle(ButtonStyle.Danger).setDisabled(step !== 'bet'),
            new ButtonBuilder().setCustomId('bet_+10').setLabel('+10').setStyle(ButtonStyle.Success).setDisabled(step !== 'bet'),
            new ButtonBuilder().setCustomId('bet_max').setLabel('MAX').setStyle(ButtonStyle.Primary).setDisabled(step !== 'bet')
        ),

        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel(`베팅 확정 (${bet}P)`)
                .setStyle(ButtonStyle.Success)
                .setDisabled(step !== 'bet' || bet <= 0)
        ),

        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('choice_odd')
                .setLabel('홀')
                .setStyle(choice === 'odd' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setDisabled(step !== 'choice'),

            new ButtonBuilder()
                .setCustomId('choice_even')
                .setLabel('짝')
                .setStyle(choice === 'even' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setDisabled(step !== 'choice')
        ),

        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('run')
                .setLabel('실행')
                .setStyle(ButtonStyle.Success)
                .setDisabled(step !== 'choice' || !choice),

            new ButtonBuilder()
                .setCustomId('cancel')
                .setLabel('취소')
                .setStyle(ButtonStyle.Danger)
        )
    ];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('홀짝')
        .setDescription('혼자 하는 홀짝 게임'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const users = loadUserData();

        ensureUser(users, userId);

        let step = 'bet';
        let currentBet = Math.min(100, users[userId].point);
        let selectedChoice = null;

        function makeEmbed() {
            return new EmbedBuilder()
                .setTitle('🎲 홀짝 게임')
                .setColor('#5865F2')
                .setDescription(
                    `보유 포인트: **${users[userId].point.toLocaleString()}P**\n\n` +
                    `현재 단계: **${step === 'bet' ? '베팅 설정' : '홀 / 짝 선택'}**\n` +
                    `베팅 금액: **${currentBet}P**\n` +
                    `선택: **${selectedChoice ?? '없음'}**`
                );
        }

        const msg = await interaction.reply({
            embeds: [makeEmbed()],
            components: createButtons(step, selectedChoice, currentBet),
            fetchReply: true
        });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === userId,
            time: 60000
        });

        collector.on('collect', async i => {
            const point = users[userId].point;

            if (i.customId.startsWith('bet_')) {
                if (step !== 'bet') return;

                const action = i.customId.replace('bet_', '');

                if (action === 'max') {
                    currentBet = point;
                } else {
                    const value = parseInt(action);
                    currentBet = Math.max(0, Math.min(point, currentBet + value));
                }
            }

            if (i.customId === 'next') {
                if (currentBet <= 0) {
                    return i.reply({ content: '베팅 금액이 0입니다.', ephemeral: true });
                }
                step = 'choice';
            }

            if (i.customId.startsWith('choice_')) {
                if (step !== 'choice') return;
                selectedChoice = i.customId.replace('choice_', '');
            }

            if (i.customId === 'cancel') {
                collector.stop('cancel');
                return i.update({ components: [] });
            }

            if (i.customId === 'run') {
                if (!selectedChoice) {
                    return i.reply({ content: '홀/짝을 선택하세요.', ephemeral: true });
                }
                collector.stop('run');
                return i.update({ components: [] });
            }

            await i.update({
                embeds: [makeEmbed()],
                components: createButtons(step, selectedChoice, currentBet)
            });
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'cancel') {
                return interaction.deleteReply().catch(() => {});
            }

            if (reason === 'run') {
                const dice = Math.floor(Math.random() * 10) + 1;
                const isOdd = dice % 2 !== 0;

                const result = isOdd ? 'odd' : 'even';
                const resultText = isOdd ? '홀' : '짝';

                const win = selectedChoice === result;

                const before = users[userId].point;

                if (win) users[userId].point += currentBet;
                else users[userId].point -= currentBet;

                saveUserData(users);

                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(win ? '승리!' : '패배')
                            .setColor(win ? '#2ecc71' : '#e74c3c')
                            .setDescription(
                                `🎲 결과: **${dice} (${resultText})**\n` +
                                `💰 ${before}P → ${users[userId].point}P`
                            )
                    ],
                    components: []
                });
            }
        });
    }
};
