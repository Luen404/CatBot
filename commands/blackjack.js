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

/* ================= PLAYER ================= */
class Player {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.hand = [];
        this.stand = false;
        this.bust = false;
        this.die = false;
        this.bet = 0;
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

/* ================= GAME ================= */
class Game {
    constructor(hostId) {
        this.hostId = hostId;
        this.players = new Map();
        this.deck = new Deck();
        this.turnOrder = [];
        this.index = 0;
        this.started = false;
        this.pot = 0;

        this.dealer = {
            hand: [],
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
        };
    }

    addPlayer(id, name, bet = 1000) {
        const db = loadDB();

        if (!db[id]) db[id] = { Point: 0 };

        if (db[id].Point < bet) return false;
        if (this.players.size >= 4) return false;
        if (this.players.has(id)) return false;
        if (this.started) return false;

        db[id].Point -= bet;
        saveDB(db);

        const p = new Player(id, name);
        p.bet = bet;

        this.players.set(id, p);
        this.pot += bet;

        return true;
    }

    start() {
        this.started = true;
        this.turnOrder = [...this.players.keys()];

        for (const p of this.players.values()) {
            p.add(this.deck.draw());
            p.add(this.deck.draw());
        }

        this.dealer.hand.push(this.deck.draw());
        this.dealer.hand.push(this.deck.draw());
    }

    currentPlayer() {
        return this.players.get(this.turnOrder[this.index]);
    }

    nextTurn() {
        let tries = 0;

        while (tries < this.turnOrder.length) {
            this.index = (this.index + 1) % this.turnOrder.length;

            const p = this.players.get(this.turnOrder[this.index]);

            if (!p.stand && !p.bust && !p.die) return;
            tries++;
        }
    }

    dealerPlay() {
        while (this.dealer.total < 17) {
            this.dealer.hand.push(this.deck.draw());
        }
    }

    finished() {
        return [...this.players.values()]
            .every(p => p.stand || p.bust || p.die);
    }
}

/* ================= GAME STORE (핵심 수정) ================= */
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
        .setName("블랙잭")
        .setDescription("최대 4명과 같이 즐길수있어요"),

    async execute(interaction) {

        const channelId = interaction.channelId;

        const game = new Game(interaction.user.id);
        games.set(channelId, game);

        const panel = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("join")
                .setLabel("JOIN")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("start")
                .setLabel("START")
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("🃏 BLACKJACK")
                    .setDescription("JOIN 후 START")
            ],
            components: [panel]
        });

        const msg = await interaction.fetchReply();

        const collector = msg.createMessageComponentCollector({
            time: 600000
        });

        collector.on("collect", async i => {

            const game = games.get(channelId);

            if (!game) {
                return i.reply({
                    content: "게임 없음 (종료됨)",
                    ephemeral: true
                });
            }

            /* ================= JOIN ================= */
            if (i.customId === "join") {
                const ok = game.addPlayer(i.user.id, i.user.username, 1000);

                if (!ok) {
                    return i.reply({
                        content: "참가 실패",
                        ephemeral: true
                    });
                }

                return i.reply({
                    content: "참가 완료 (-1000P)",
                    ephemeral: true
                });
            }

            /* ================= START ================= */
            if (i.customId === "start") {

                if (i.user.id !== game.hostId) {
                    return i.reply({
                        content: "호스트만 시작 가능",
                        ephemeral: true
                    });
                }

                if (game.started) {
                    return i.reply({
                        content: "이미 시작됨",
                        ephemeral: true
                    });
                }

                game.start();

                const p = game.currentPlayer();

                await i.deferUpdate();

                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("🎮 게임 시작")
                            .setDescription(
                                `팟: ${game.pot}\n현재 턴: ${p.name}\n카드: ${p.handText()}\n합계: ${p.total}`
                            )
                    ],
                    components: [buttons()]
                });
            }

            /* ================= TURN ================= */
            const player = game.currentPlayer();
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
                    game.nextTurn();
                }
            }

            if (i.customId === "stand") {
                player.stand = true;
                game.nextTurn();
            }

            if (i.customId === "die") {
                player.die = true;
                player.stand = true;
                game.nextTurn();
            }

            /* ================= END ================= */
            if (game.finished()) {

                game.dealerPlay();

                const db = loadDB();

                let result = `딜러: ${game.dealer.total}\n\n`;

                for (const p of game.players.values()) {

                    if (!db[p.id]) db[p.id] = { Point: 0 };

                    if (p.die || p.bust) {
                        result += `${p.name}: 패배\n`;
                        continue;
                    }

                    if (game.dealer.total > 21 || p.total > game.dealer.total) {
                        db[p.id].Point += p.bet * 2;
                        result += `${p.name}: 승리 +${p.bet * 2}\n`;
                    } else if (p.total === game.dealer.total) {
                        db[p.id].Point += p.bet;
                        result += `${p.name}: 무승부 +${p.bet}\n`;
                    } else {
                        result += `${p.name}: 패배\n`;
                    }
                }

                saveDB(db);
                games.delete(channelId);

                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("🏁 게임 종료")
                            .setDescription(result)
                    ],
                    components: []
                });
            }

            const next = game.currentPlayer();

            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("🃏 진행 중")
                        .setDescription(
                            `팟: ${game.pot}\n현재 턴: ${next.name}\n카드: ${next.handText()}\n합계: ${next.total}`
                        )
                ],
                components: [buttons()]
            });
        });
    }
};
