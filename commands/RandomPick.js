const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../data/Percent.json');
const inventoryPath = path.join(__dirname, '../data/Inventory.json');
const usersPath = path.join(__dirname, '../data/users.json');

function readConfig() {
    if (!fs.existsSync(configPath)) {
        return { items: [] };
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

function readInventory() {
    if (!fs.existsSync(inventoryPath)) {
        fs.mkdirSync(path.dirname(inventoryPath), { recursive: true });
        fs.writeFileSync(inventoryPath, JSON.stringify({}, null, 4));
    }
    return JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));
}

function saveInventory(data) {
    fs.writeFileSync(inventoryPath, JSON.stringify(data, null, 4), 'utf-8');
}

function readUsers() {
    if (!fs.existsSync(usersPath)) {
        fs.mkdirSync(path.dirname(usersPath), { recursive: true });
        fs.writeFileSync(usersPath, JSON.stringify({}, null, 4));
    }
    return JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
}

function saveUsers(data) {
    fs.writeFileSync(usersPath, JSON.stringify(data, null, 4), 'utf-8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('뽑기')
        .setDescription('확률에 따라 품목을 뽑고 개인 인벤토리에 저장합니다'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const userTag = interaction.user.tag;
        
        const users = readUsers();

        if (!users[userId]) {
            users[userId] = {
                tag: userTag,
                Ticket: 0
            };
            saveUsers(users);
        }

        if (users[userId].Ticket <= 0) {
            return interaction.reply({ content: "보유하신 뽑기권이 없습니다. 보관함 명령어로 확인해보세요.", ephemeral: true });
        }

        const config = readConfig();

        if (!config.items || config.items.length === 0) {
            return interaction.reply({ content: "등록된 뽑기 품목이 없습니다. 관리자에게 문의하세요.", ephemeral: true });
        }

        const totalChance = config.items.reduce((sum, item) => sum + item.chance, 0);

        if (totalChance === 0) {
            return interaction.reply({ content: "뽑기 품목들의 확률 합이 0입니다. 관리자에게 문의하세요.", ephemeral: true });
        }

        users[userId].Ticket -= 1;
        saveUsers(users);

        const randomValue = Math.random() * totalChance;
        
        let currentSum = 0;
        let selectedItem = null;

        for (const item of config.items) {
            currentSum += item.chance;
            if (randomValue <= currentSum) {
                selectedItem = item;
                break;
            }
        }

        if (!selectedItem) {
            selectedItem = config.items[config.items.length - 1];
        }

        let isSaved = false;

        if (selectedItem.name !== "꽝") {
            const inventory = readInventory();

            if (!inventory[userId]) {
                inventory[userId] = [];
            }

            inventory[userId].push({
                itemId: selectedItem.id,
                name: selectedItem.name,
                obtainedAt: new Date().toISOString()
            });

            saveInventory(inventory);   
            isSaved = true;
        }

        const descriptionMessage = isSaved 
            ? `@<${interaction.user.username}>님이 뽑은 결과이며, 개인 보관함에 저장되었습니다.`
            : `@<${interaction.user.username}>님이 뽑은 결과입니다.`;

        const embed = {
            title: "뽑기 결과",
            description: descriptionMessage,
            color: 0x5865F2,
            fields: [
                { name: "당첨 품목", value: selectedItem.name, inline: true },
                { name: "획득 확률", value: `${selectedItem.chance}%`, inline: true },
                { name: "남은 뽑기권", value: `${users[userId].Ticket}장`, inline: true }
            ],
        };

        await interaction.reply({ embeds: [embed] });
    }
};