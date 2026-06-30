const { EmbedBuilder } = require("discord.js");

class BlackjackEmbedBuilder {
    static gameStatus(status) {
        const embed = new EmbedBuilder()
            .setTitle("🎴 Blackjack")
            .setColor(0x2b2d31);

        let desc = "";

        for (const p of status.players) {
            desc += `**${p.name}**\n`;
            desc += `Hand: ${p.hand}\n`;
            desc += `Total: ${p.total}\n`;
            desc += `Bet: ${p.bet}\n`;
            desc += `Status: ${p.bust ? "BUST" : p.stand ? "STAND" : "PLAYING"}\n\n`;
        }

        desc += `**Dealer**\n`;
        desc += `Hand: ${status.dealer.hand}\n`;

        embed.setDescription(desc);

        return embed;
    }

    static result(result) {
        const embed = new EmbedBuilder()
            .setTitle("🏁 Result")
            .setColor(0x00ff99);

        let desc = "";

        for (const r of result.results) {
            desc += `**${r.name}** → ${r.result} | payout: ${r.payout}\n`;
        }

        desc += `\n**Dealer**\n${result.dealer.getHandString()}`;

        embed.setDescription(desc);

        return embed;
    }

    static simple(text) {
        return new EmbedBuilder()
            .setColor(0x5865f2)
            .setDescription(text);
    }
}

module.exports = BlackjackEmbedBuilder;
