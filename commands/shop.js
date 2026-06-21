const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const shopPath = path.join(__dirname, '../data/Shop.json');
const usersPath = path.join(__dirname, '../data/users.json');
const inventoryPath = path.join(__dirname, '../data/Inventory.json');

function readJson(filePath, defaultData = {}) {
    if (!fs.existsSync(filePath)) return defaultData;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function saveJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('상점')
        .setDescription('포인트를 사용하여 상품을 구매합니다'),

    async execute(interaction) {
        const shopData = readJson(shopPath, { items: [] });
        const userID = interaction.user.id;

        const fixedTicketItem = {
            id: "fixed_gacha_ticket",
            name: "가챠 티켓",
            price: 1000
        };

        const allItems = [fixedTicketItem, ...shopData.items];

        const users = readJson(usersPath, {});
        const currentPoint = (users[userID] && users[userID].Point) ? users[userID].Point : 0;

        const embed = {
            title: "포인트 상점",
            description: `구매할 상품을 아래 메뉴에서 선택하세요.\n현재 보유 포인트: ${currentPoint}P`,
            color: 0x5865F2,
            fields: allItems.map(i => ({
                name: i.name,
                value: `가격: ${i.price}P`,
                inline: true
            }))
        };

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('buy_item')
            .setPlaceholder('구매할 상품을 선택하세요');

        allItems.forEach(item => {
            selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(item.name)
                    .setDescription(`가격: ${item.price}P`)
                    .setValue(item.id)
            );
        });

        const row = new ActionRowBuilder().addComponents(selectMenu);
        const response = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true, fetchReply: true });

        const collector = response.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: "본인의 상점 메뉴만 이용할 수 있습니다.", ephemeral: true });
            }

            const freshUsers = readJson(usersPath, {});
            const freshShop = readJson(shopPath, { items: [] });
            
            const currentAllItems = [fixedTicketItem, ...freshShop.items];
            const selectedId = i.values[0];
            const item = currentAllItems.find(idx => idx.id === selectedId);

            if (!item) {
                return i.update({ content: "존재하지 않거나 삭제된 상품입니다.", embeds: [], components: [] });
            }

            if (!freshUsers[userID]) {
                freshUsers[userID] = { 
                    tag: interaction.member.displayName, 
                    Ticket: 0, 
                    Point: 0 
                };
            }
            if (freshUsers[userID].Point === undefined) freshUsers[userID].Point = 0;

            if (freshUsers[userID].Point < item.price) {
                return i.reply({ content: `포인트가 부족합니다. (필요: ${item.price}P / 보유: ${freshUsers[userID].Point}P)`, ephemeral: true });
            }

            freshUsers[userID].Point -= item.price;

            if (item.id === "fixed_gacha_ticket") {
                freshUsers[userID].Ticket = (freshUsers[userID].Ticket || 0) + 1;
                saveJson(usersPath, freshUsers);

                await i.update({
                    embeds: [{
                        title: "구매 완료",
                        description: `[${item.name}]을 구매하여 즉시 티켓이 지급되었습니다.\n현재 보유 티켓: ${freshUsers[userID].Ticket}장\n차감 포인트: ${item.price}P\n남은 포인트: ${freshUsers[userID].Point}P`,
                        color: 0x57F287
                    }],
                    components: []
                });
            } else {
                saveJson(usersPath, freshUsers);
                
                const inventory = readJson(inventoryPath, {});
                if (!inventory[userID]) inventory[userID] = [];
                
                inventory[userID].push({
                    itemId: item.id,
                    name: item.name,
                    obtainedAt: new Date().toISOString()
                });
                saveJson(inventoryPath, inventory);

                await i.update({
                    embeds: [{
                        title: "구매 완료",
                        description: `[${item.name}] 상품을 구매하여 보관함에 추가했습니다.\n차감 포인트: ${item.price}P\n남은 포인트: ${freshUsers[userID].Point}P`,
                        color: 0x57F287
                    }],
                    components: []
                });
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};