const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const games = new Map();

/* ================= GAME ================= */
class Game {
    constructor(hostId) {
        this.hostId = hostId;
        this.players = new Map();
        this.started = false;
        this.deck = [];
        this.turn = [];
        this.index = 0;
    }

    addPlayer(id, name) {
        if (this.started) return false;
        if (this.players.has(id)) return false;

        this.players.set(id, { id, name, hand: [], stand: false });
        return true;
    }

    listPlayers() {
        return [...this.players.values()]
            .map(p => `• ${p.name}`)
            .join("\n") || "없음";
    }

    start() {
        this.started = true;

        // deck
        this.deck = Array.from({ length: 52 }, (_, i) => (i % 13) + 1)
            .sort(() => Math.random() - 0.5);

        this.turn = [...this.players.keys()];

        for (const p of this.players.values()) {
            p.hand.push(this.draw(), this.draw());
        }
    }

    draw() {
        return this.deck.pop();
    }

    current() {
        return this.players.get(this.turn[this.index]);
    }

    next() {
        let loop = 0;

        while (loop < this.turn.length) {
            this.index = (this.index + 1) % this.turn.length;
            const p = this.players.get(this.turn[this.index]);

            if (!p.stand) return;
            loop++;
        }
    }

    finished() {
        return [...this.players.values()].every(p => p.stand);
    }
}

/* ================= UI ================= */
function lobbyEmbed(game) {
    return new EmbedBuilder()
        .setTitle("🃏 블랙잭 모집중")
        .setDescription(
            `30초 후 자동 시작\n\n👥 참가자:\n${game.listPlayers()}`
        );
}

function gameButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("hit").setLabel("HIT").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("stand").setLabel("STAND").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("die").setLabel("DIE").setStyle(ButtonStyle.Danger)
    );
}

/* ================= COMMAND ================= */
module.exports = {
    data: new SlashCommandBuilder()
        .setName("블랙잭")
        .setDescription("도박을 해요"),

    async execute(interaction) {

        const game = new Game(interaction.user.id);
        const msg = await interaction.reply({
            embeds: [lobbyEmbed(game)],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("join")
                        .setLabel("JOIN")
                        .setStyle(ButtonStyle.Success)
                )
            ],
            fetchReply: true
        });

        const messageId = msg.id;
        games.set(messageId, game);

        /* ================= JOIN ================= */
        const collector = msg.createMessageComponentCollector({
            time: 30000
        });

        const updateLobby = async () => {
            const g = games.get(messageId);
            if (!g) return;

            await interaction.editReply({
                embeds: [lobbyEmbed(g)],
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("join")
                            .setLabel("JOIN")
                            .setStyle(ButtonStyle.Success)
                    )
                ]
            });
        };

        collector.on("collect", async i => {
            const g = games.get(messageId);
            if (!g) return;

            if (i.customId === "join") {
                g.addPlayer(i.user.id, i.user.username);

                await i.reply({
                    content: "참가 완료",
                    ephemeral: true
                });

                // 🔥 핵심: 참가자 즉시 갱신
                updateLobby();
            }
        });

        /* ================= AUTO START (FIXED) ================= */
        setTimeout(async () => {

            const g = games.get(messageId);
            if (!g) return;

            if (g.players.size === 0) {
                games.delete(messageId);
                return interaction.editReply({
                    content: "참가자가 없어 게임 종료",
                    components: [],
                    embeds: []
                });
            }

            g.start();

            const p = g.current();

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("🎮 시작")
                        .setDescription(`턴: ${p.name}`)
                ],
                components: [gameButtons()]
            });

            const gameMsg = await interaction.fetchReply();

            const gc = gameMsg.createMessageComponentCollector({
                time: 600000
            });

            gc.on("collect", async i => {

                const g = games.get(messageId);
                if (!g) return;

                const player = g.current();
                if (!player) return;

                if (i.user.id !== player.id) {
                    return i.reply({ content: "턴 아님", ephemeral: true });
                }

                await i.deferUpdate();

                if (i.customId === "stand") {
                    player.stand = true;
                    g.next();
                }

                if (g.finished()) {
                    games.delete(messageId);

                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("종료")
                                .setDescription("게임 끝")
                        ],
                        components: []
                    });
                }

                const next = g.current();

                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("진행중")
                            .setDescription(`턴: ${next.name}`)
                    ],
                    components: [gameButtons()]
                });
            });

        }, 30000);
    }
};
