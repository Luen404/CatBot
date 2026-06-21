const { SlashCommandBuilder } = require("discord.js");
const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, '../data/users.json');
const percentPath = path.join(__dirname, '../data/Percent.json');
const inventoryPath = path.join(__dirname, '../data/Inventory.json');

function readJson(filePath, defaultData = {}) {
    if (!fs.existsSync(filePath)) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 4));
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function saveJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('뽑기')
        .setDescription('뽑기 티켓 1장을 사용하여 가챠를 진행합니다'),

    async execute(interaction) {
        const userID = interaction.user.id;
        const userDisplayName = interaction.member.displayName;

        const users = readJson(usersPath, {});
        const percentData = readJson(percentPath, { items: [] });

        if (percentData.items.length === 0) {
            return interaction.reply({ content: "현재 등록된 가챠 상품이 없습니다. 관리자 메뉴에서 먼저 등록해주세요.", ephemeral: true });
        }

        if (!users[userID] || !users[userID].Ticket || users[userID].Ticket < 1) {
            const currentTicket = users[userID] ? (users[userID].Ticket || 0) : 0;
            return interaction.reply({ content: `뽑기 티켓이 부족합니다. (필요: 1장 / 보유: ${currentTicket}장)\n상점에서 포인트를 사용해 티켓을 구매할 수 있습니다.`, ephemeral: true });
        }

        // 1. 확률 계산
        const randomNumber = Math.random() * 100;
        let accumulate = 0;
        let pickedItem = null;

        for (const item of percentData.items) {
            accumulate += item.chance;
            if (randomNumber < accumulate) {
                pickedItem = item;
                break;
            }
        }

        if (!pickedItem) {
            pickedItem = percentData.items[percentData.items.length - 1];
        }

        // 2. 재화 차감 및 저장
        users[userID].Ticket -= 1;
        saveJson(usersPath, users);

        // 3. '꽝' 판별 및 보관함(Inventory) 저장 처리
        // 아이템 이름에 '꽝'이 포함되어 있거나, ID가 '꽝' 관련 단어일 경우 보관함 저장을 건너뜁니다.
        const isKkwang = pickedItem.name.includes("꽝") || 
                        (pickedItem.id && String(pickedItem.id).includes("꽝")) ||
                        (pickedItem.id && String(pickedItem.id).toLowerCase().includes("kkwang"));

        if (!isKkwang) {
            const inventory = readJson(inventoryPath, {});
            if (!inventory[userID]) inventory[userID] = [];

            inventory[userID].push({
                itemId: pickedItem.id || `gacha_${Date.now()}`,
                name: pickedItem.name,
                obtainedAt: new Date().toISOString()
            });
            saveJson(inventoryPath, inventory);
        }

        // 4. 결과 출력
        const embed = {
            title: "가챠 결과 안내",
            description: `${userDisplayName}님이 아래의 아이템을 획득했습니다.`,
            color: isKkwang ? 0x95A5A6 : 0x5865F2, // 꽝이면 회색, 성공이면 파란색
            fields: [
                { name: "획득 아이템", value: pickedItem.name, inline: true },
                { name: "등장 확률", value: `${pickedItem.chance}%`, inline: true },
                { name: "남은 티켓", value: `${users[userID].Ticket}장`, inline: false }
            ],
            // 꽝일 때 유저가 알아채기 쉽도록 안내 문구 추
        };

        await interaction.reply({ embeds: [embed] });
    }
};
