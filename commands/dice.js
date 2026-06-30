const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
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

async function renderCanvas(bet, choice) {
    const canvas = createCanvas(400, 200);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#2c2f33';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('🎲 홀짝 게임', 30, 50);

    ctx.fillStyle = '#99aab5';
    ctx.font = '16px sans-serif';
    ctx.fillText('베팅 금액', 30, 100);

    ctx.fillStyle = '#e67e22';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(`${bet.toLocaleString()}P`, 30, 140);

    ctx.fillStyle = choice ? (choice === 'odd' ? '#3498db' : '#2ecc71') : '#728da0';
    ctx.beginPath();
    ctx.arc(320, 100, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(choice ? (choice === 'odd' ? '홀' : '짝') : '?', 320, 100);

    return new AttachmentBuilder(await canvas.encode('png'), { name: 'game.png' });
}

function createComponents(choice) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('bet_-100').setLabel('-100').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('bet_-10').setLabel('-10').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('bet_-1').setLabel('-1').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('bet_+1').setLabel('+1').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('bet_+10').setLabel('+10').setStyle(ButtonStyle.Success)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('bet_+100').setLabel('+100').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('bet_max').setLabel('MAX').setStyle(ButtonStyle.Primary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('choice_odd')
                .setLabel('홀')
                .setStyle(choice === 'odd' ? ButtonStyle.Primary : ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('choice_even')
                .setLabel('짝')
                .setStyle(choice === 'even' ? ButtonStyle.Primary : ButtonStyle.Secondary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('action_confirm')
                .setLabel('실행')
                .setStyle(ButtonStyle.Success)
                .setDisabled(!choice),

            new ButtonBuilder()
                .setCustomId('action_cancel')
                .setLabel('취소')
                .setStyle(ButtonStyle.Danger)
        )
    ];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('홀짝')
        .setDescription('포인트를 걸고 홀짝 게임을 진행합니다.'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const users = loadUserData();

        if (!users[userId]) {
            users[userId] = { point: 0 };
        }

        let currentBet = Math.min(100, users[userId].point);
        let selectedChoice = null;

        const attachment = await renderCanvas(currentBet, selectedChoice);

        const baseEmbed = new EmbedBuilder()
            .setTitle('🎲 홀짝 배틀')
            .setDescription(`현재 보유 포인트: **${users[userId].point.toLocaleString()}P**\n베팅 후 홀/짝 선택`)
            .setImage('attachment://game.png')
            .setColor('#5865F2');

        const message = await interaction.reply({
            embeds: [baseEmbed],
            files: [attachment],
            components: createComponents(selectedChoice),
            fetchReply: true
        });

        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === userId,
            time: 60000
        });

        collector.on('collect', async i => {
            const userPoints = users[userId].point;

            if (i.customId.startsWith('bet_')) {
                const action = i.customId.replace('bet_', '');

                if (action === 'max') {
                    currentBet = userPoints;
                } else {
                    const value = parseInt(action);
                    currentBet = Math.min(userPoints, Math.max(0, currentBet + value));
                }
            }

            if (i.customId.startsWith('choice_')) {
                selectedChoice = i.customId.replace('choice_', '');
            }

            if (i.customId === 'action_cancel') {
                collector.stop('cancel');
                return i.update({ components: [] });
            }

            if (i.customId === 'action_confirm') {
                if (!selectedChoice) {
                    return i.followUp({
                        content: '홀/짝을 먼저 선택하세요.',
                        ephemeral: true
                    });
                }

                if (currentBet <= 0) {
                    return i.followUp({
                        content: '0P 이상 베팅해야 합니다.',
                        ephemeral: true
                    });
                }

                if (userPoints < currentBet) {
                    return i.followUp({
                        content: '보유 포인트가 부족합니다.',
                        ephemeral: true
                    });
                }

                collector.stop('run');
                return i.update({ components: [] });
            }

            const nextAttachment = await renderCanvas(currentBet, selectedChoice);

            const nextEmbed = new EmbedBuilder()
                .setTitle('🎲 홀짝 배틀')
                .setDescription(`현재 보유 포인트: **${userPoints.toLocaleString()}P**`)
                .setImage('attachment://game.png')
                .setColor('#5865F2');

            await i.update({
                embeds: [nextEmbed],
                files: [nextAttachment],
                components: createComponents(selectedChoice)
            });
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'cancel') {
                return interaction.deleteReply().catch(() => {});
            }

            if (reason === 'run') {
                const dice = Math.floor(Math.random() * 10) + 1;
                const isOdd = dice % 2 !== 0;

                const resultType = isOdd ? 'odd' : 'even';
                const resultText = isOdd ? '홀' : '짝';

                const isWin = selectedChoice === resultType;

                const oldPoints = users[userId].point;

                if (isWin) {
                    users[userId].point += currentBet;
                } else {
                    users[userId].point -= currentBet;
                }

                saveUserData(users);

                const canvas = createCanvas(400, 200);
                const ctx = canvas.getContext('2d');

                ctx.fillStyle = isWin ? '#1f8b4c' : '#ad1457';
                ctx.fillRect(0, 0, 400, 200);

                ctx.fillStyle = '#fff';
                ctx.font = 'bold 28px sans-serif';
                ctx.textAlign = 'center';

                ctx.fillText(isWin ? '🎉 승리!' : '💥 패배!', 200, 60);
                ctx.font = '20px sans-serif';
                ctx.fillText(`결과: ${dice} (${resultText})`, 200, 110);
                ctx.fillText(`${oldPoints} → ${users[userId].point}`, 200, 150);

                const resultAttachment = new AttachmentBuilder(await canvas.encode('png'), {
                    name: 'result.png'
                });

                const resultEmbed = new EmbedBuilder()
                    .setTitle(isWin ? '🎰 승리' : '🎰 패배')
                    .setImage('attachment://result.png')
                    .setColor(isWin ? '#2ecc71' : '#e74c3c');

                return interaction.editReply({
                    embeds: [resultEmbed],
                    files: [resultAttachment],
                    components: []
                });
            }
        });
    }
};
