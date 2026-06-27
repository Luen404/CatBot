const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
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

function createShopMessage(userID, allItems) {
    const users = readJson(usersPath, {});
    const currentPoint = (users[userID] && users[userID].Point) ? users[userID].Point : 0;

    const embed = {
        title: "포인트 상점",
        description: `구매할 상품을 아래 메뉴에서 선택하세요.\n현재 보유 포인트: **${currentPoint}P**`,
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
    return { embeds: [embed], components: [row] };
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

        const shopMsg = createShopMessage(userID, allItems);
        const response = await interaction.reply({ ...shopMsg, ephemeral: true, fetchReply: true });

        const collector = response.createMessageComponentCollector({ time: 300000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: "본인의 상점 메뉴만 이용할 수 있습니다.", ephemeral: true });
            }

            const selectedId = i.values[0];
            const freshShop = readJson(shopPath, { items: [] });
            const currentAllItems = [fixedTicketItem, ...freshShop.items];
            const item = currentAllItems.find(idx => idx.id === selectedId);

            if (!item) {
                return i.update({ content: "존재하지 않거나 삭제된 상품입니다.", embeds: [], components: [] });
            }

            const modalCustomId = `quantity_modal_${Date.now()}`;
            const modal = new ModalBuilder()
                .setCustomId(modalCustomId)
                .setTitle(`${item.name} 구매`);

            const quantityInput = new TextInputBuilder()
                .setCustomId('quantity_input')
                .setLabel('구매할 수량을 입력하세요 (숫자만)')
                .setPlaceholder('예: 5')
                .setValue('1')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const modalRow = new ActionRowBuilder().addComponents(quantityInput);
            modal.addComponents(modalRow);

            await i.showModal(modal);

            try {
                const modalSubmission = await i.awaitModalSubmit({
                    filter: m => m.customId === modalCustomId && m.user.id === interaction.user.id,
                    time: 60000
                });

                const quantityStr = modalSubmission.fields.getTextInputValue('quantity_input');
                const quantity = parseInt(quantityStr, 10);

                if (isNaN(quantity) || quantity <= 0) {
                    return modalSubmission.reply({ content: "올바른 수량을 입력해주세요. (1 이상의 숫자)", ephemeral: true });
                }

                const freshUsers = readJson(usersPath, {});
                if (!freshUsers[userID]) {
                    freshUsers[userID] = { tag: interaction.member.displayName, Ticket: 0, Point: 0 };
                }
                if (freshUsers[userID].Point === undefined) freshUsers[userID].Point = 0;

                const totalPrice = item.price * quantity;

                if (freshUsers[userID].Point < totalPrice) {
                    return modalSubmission.reply({ 
                        content: `포인트가 부족합니다.\n필요 포인트: ${totalPrice}P (개당 ${item.price}P × ${quantity}개)\n보유 포인트: ${freshUsers[userID].Point}P`, 
                        ephemeral: true 
                    });
                }

                freshUsers[userID].Point -= totalPrice;

                if (item.id === "fixed_gacha_ticket") {
                    freshUsers[userID].Ticket = (freshUsers[userID].Ticket || 0) + quantity;
                    saveJson(usersPath, freshUsers);
                } else {
                    saveJson(usersPath, freshUsers);
                    
                    const inventory = readJson(inventoryPath, {});
                    if (!inventory[userID]) inventory[userID] = [];
                    
                    for (let k = 0; k < quantity; k++) {
                        inventory[userID].push({
                            itemId: item.id,
                            name: item.name,
                            obtainedAt: new Date().toISOString()
                        });
                    }
                    saveJson(inventoryPath, inventory);
                }

                await modalSubmission.reply({
                    content: `[${item.name}] ${quantity}개 구매가 완료되었습니다!\n차감 포인트: -${totalPrice}P\n남은 포인트: ${freshUsers[userID].Point}P`,
                    ephemeral: true
                });

                const updatedShopMsg = createShopMessage(userID, currentAllItems);
                await interaction.editReply(updatedShopMsg);

            } catch (err) {
                console.error(err);
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};