const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
} = require('discord.js');

const { createCanvas } = require('@napi-rs/canvas');
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

async function renderCanvas(bet, choice, step) {
    const canvas = createCanvas(400, 200);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#2c2f33';
    ctx.fillRect(0, 0, 400, 200);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('🎲 홀짝 게임', 30, 50);

    ctx.fillStyle = '#99aab5';
    ctx.font = '16px sans-serif';

    ctx.fillText(
        step === 'bet'
            ? '1단계: 베팅 설정'
            : '2단계: 홀 / 짝 선택',
        30,
        80
    );

    ctx.fillStyle = '#e67e22';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(`${bet.toLocaleString()}P`, 30, 130);

    ctx.fillStyle = step === 'choice'
        ? (choice === 'odd' ? '#3498db' : choice === 'even' ? '#2ecc71' : '#7289da')
        : '#7289da';

    ctx.beginPath();
    ctx.arc(320, 100, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(
        step === 'choice'
            ? (choice === 'odd' ? '홀' : choice === 'even' ? '짝' : '?')
            : 'BET',
        320,
        100
    );

    return new AttachmentBuilder(await canvas.encode('png'), { name: 'game.png' });
}

function createComponents(step, choice) {
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
                .setLabel('베팅 확정')
                .setStyle(ButtonStyle.Success)
                .setDisabled(step !== 'bet')
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

        const attachment = await renderCanvas(currentBet, selectedChoice, step);

        const embed = new EmbedBuilder()
            .setTitle('🎲 홀짝')
            .setDescription(`보유 포인트: ${users[userId].point.toLocaleString()}P`)
            .setImage('attachment://game.png')
            .setColor('#5865F2');

        const msg = await interaction.reply({
            embeds: [embed],
            files: [attachment],
            components: createComponents(step, selectedChoice),
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
                    const val = parseInt(action);
                    currentBet = Math.max(0, Math.min(point, currentBet + val));
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
                if (!selectedChoice || step !== 'choice') {
                    return i.reply({ content: '선택을 완료하세요.', ephemeral: true });
                }
                collector.stop('run');
                return i.update({ components: [] });
            }

            const updated = await renderCanvas(currentBet, selectedChoice, step);

            const newEmbed = new EmbedBuilder()
                .setTitle('🎲 홀짝')
                .setDescription(`보유 포인트: ${point.toLocaleString()}P`)
                .setImage('attachment://game.png')
                .setColor('#5865F2');

            await i.update({
                embeds: [newEmbed],
                files: [updated],
                components: createComponents(step, selectedChoice)
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

                const canvas = createCanvas(400, 200);
                const ctx = canvas.getContext('2d');

                ctx.fillStyle = win ? '#1f8b4c' : '#ad1457';
                ctx.fillRect(0, 0, 400, 200);

                ctx.fillStyle = '#fff';
                ctx.font = 'bold 26px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.fillText(win ? '승리!' : '패배!', 200, 60);
                ctx.font = '18px sans-serif';
                ctx.fillText(`결과: ${dice} (${resultText})`, 200, 110);
                ctx.fillText(`${before} → ${users[userId].point}`, 200, 150);

                const resultImg = new AttachmentBuilder(await canvas.encode('png'), {
                    name: 'result.png'
                });

                const resultEmbed = new EmbedBuilder()
                    .setTitle(win ? '🎉 승리' : '💥 패배')
                    .setImage('attachment://result.png')
                    .setColor(win ? '#2ecc71' : '#e74c3c');

                return interaction.editReply({
                    embeds: [resultEmbed],
                    files: [resultImg],
                    components: []
                });
            }
        });
    }
};
