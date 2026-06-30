const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "data", "users.json");

/* ================= DB ================= */
function loadDB() {
    if (!fs.existsSync(dbPath)) return {};
    return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
}

function saveDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

/* ================= GAME ================= */
class Player {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.hand = [];
        this.stand = false;
        this.bust = false;
        this.die = false;
    }

    add(card) {
        this.hand.push(card);
    }

    get total() {
        let sum = 0;
        let ace = 0;

        for (const c of this.hand) {
            if (c === 1) {
                ace++;
                sum += 1;
            } else if (c >= 11) {
                sum += 10;
            } else {
                sum += c;
            }
        }

        while (ace > 0 && sum + 10 <= 21) {
            sum += 10;
            ace--;
        }

        return sum;
    }

    handText() {
        return this.hand.join(", ");
    }
}

/* ================= DECK ================= */
class Deck {
    constructor() {
        this.cards = [];

        for (let i = 1; i <= 13; i++) {
            for (let j = 0; j < 4; j++) {
                this.cards.push(i);
            }
        }

        this.cards.sort(() => Math.random() - 0.5);
    }

    draw() {
        return this.cards.pop();
    }
}

/* ================= GAME CLASS ================= */
class Game {
    constructor(hostId) {
        this.hostId = hostId;
        this.players = new Map();
        this.deck = new Deck();
        this.turnOrder = [];
        this.index = 0;
        this.started = false;
    }

    addPlayer(id, name) {
        if (this.started) return false;
        if (this.players.has(id)) return false;

        this.players.set(id, new Player(id, name));
        return true;
    }

    start() {
        this.started = true;
        this.turnOrder = [...this.players.keys()];

        for (const p of this.players.values()) {
            p.add(this.deck.draw());
            p.add(this.deck.draw());
        }
    }

    current() {
        return this.players.get(this.turnOrder[this.index]);
    }

    next() {
        let loop = 0;

        while (loop < this.turnOrder.length) {
            this.index = (this.index + 1) % this.turnOrder.length;

            const p = this.players.get(this.turnOrder[this.index]);

            if (!p.stand && !p.bust && !p.die) return;
            loop++;
        }
    }

    finished() {
        return [...this.players.values()]
            .every(p => p.stand || p.bust || p.die);
    }

    dealerPlay() {
        this.dealer = { hand: [] };

        this.dealer.hand.push(this.deck.draw());
        this.dealer.hand.push(this.deck.draw());

        const calc = (hand) => {
            let sum = 0;
            let ace = 0;

            for (const c of hand) {
                if (c === 1) {
                    ace++;
                    sum += 1;
                } else if (c >= 11) {
                    sum += 10;
                } else {
                    sum += c;
                }
            }

            while (ace > 0 && sum + 10 <= 21) {
                sum += 10;
                ace--;
            }

            return sum;
        };

        while (calc(this.dealer.hand) < 17) {
            this.dealer.hand.push(this.deck.draw());
        }

        this.dealer.total = calc(this.dealer.hand);
    }
}

/* ================= STORE ================= */
const games = new Map();

/* ================= BUTTONS ================= */
function buttons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("hit").setLabel("HIT").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("stand").setLabel("STAND").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("die").setLabel("DIE").setStyle(ButtonStyle.Danger)
    );
}

/* ================= COMMAND ================= */
module.exports = {
    data: new SlashCommandBuilder()
        .setName("blackjack")
        .setDescription("블랙잭"),

    async execute(interaction) {

        /* ================= MESSAGE KEY ================= */
        const msg = await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("🃏 블랙잭 모집")
                    .setDescription("30초 후 자동 시작")
            ],
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

        const game = new Game(interaction.user.id);
        games.set(messageId, game);

        /* ================= LOBBY ================= */
        const collector = msg.createMessageComponentCollector({
            time: 30000
        });

        collector.on("collect", async i => {

            const game = games.get(messageId);
            if (!game) return;

            if (i.customId === "join") {
                game.addPlayer(i.user.id, i.user.username);

                return i.reply({
                    content: "참가 완료",
                    ephemeral: true
                });
            }
        });

        /* ================= AUTO START ================= */
        collector.on("end", async () => {

            const game = games.get(messageId);
            if (!game) return;

            game.start();

            const p = game.current();

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("🎮 게임 시작")
                        .setDescription(
                            `턴: ${p.name}\n카드: ${p.handText()}\n합계: ${p.total}`
                        )
                ],
                components: [buttons()]
            });

            const gameMsg = await interaction.fetchReply();

            const gameCollector = gameMsg.createMessageComponentCollector({
                time: 600000
            });

            gameCollector.on("collect", async i => {

                const game = games.get(messageId);
                if (!game) return;

                const player = game.current();
                if (!player) return;

                if (i.user.id !== player.id) {
                    return i.reply({
                        content: "턴 아님",
                        ephemeral: true
                    });
                }

                await i.deferUpdate();

                if (i.customId === "hit") {
                    player.add(game.deck.draw());

                    if (player.total > 21) {
                        player.bust = true;
                        game.next();
                    }
                }

                if (i.customId === "stand") {
                    player.stand = true;
                    game.next();
                }

                if (i.customId === "die") {
                    player.die = true;
                    player.stand = true;
                    game.next();
                }

                if (game.finished()) {

                    game.dealerPlay();

                    let result = `딜러: ${game.dealer.total}\n\n`;

                    for (const p of game.players.values()) {
                        if (p.die || p.bust) {
                            result += `${p.name}: 패배\n`;
                            continue;
                        }

                        if (game.dealer.total > 21 || p.total > game.dealer.total) {
                            result += `${p.name}: 승리\n`;
                        } else {
                            result += `${p.name}: 패배\n`;
                        }
                    }

                    games.delete(messageId);

                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("🏁 종료")
                                .setDescription(result)
                        ],
                        components: []
                    });
                }

                const next = game.current();

                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("🃏 진행중")
                            .setDescription(
                                `턴: ${next.name}\n카드: ${next.handText()}\n합계: ${next.total}`
                            )
                    ],
                    components: [buttons()]
                });
            });
        });
    }
};
