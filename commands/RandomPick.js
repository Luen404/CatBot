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

        // 1. Math.floor를 쓰지 않고 0 이상 100 미만의 소수점 난수를 생성 (0.1% 판별 핵심)
        const randomNumber = Math.random() * 100;

        let accumulate = 0;
        let pickedItem = null;

        // 2. 누적 확률 계산 (소수점끼리 오차 없이 비교 처리)
        for (const item of percentData.items) {
            accumulate += item.rollbackPercent;
            if (randomNumber < accumulate) {
                pickedItem = item;
                break;
            }
        }

        // 만약 확률 합계가 100% 미만이라 아무것도 뽑히지 않은 경우 예외 처리
        if (!pickedItem) {
            pickedItem = percentData.items[percentData.items.length - 1];
        }

        // 3. 재화 차감 (티켓 1장 사용)
        users[userID].Ticket -= 1;
        saveJson(usersPath, users);

        // 4. 획득한 아이템 보관함(Inventory.json)에 저장
        const inventory = readJson(inventoryPath, {});
        if (!inventory[userID]) inventory[userID] = [];

        inventory[userID].push({
            itemId: pickedItem.id || `gacha_${Date.now()}`,
            name: pickedItem.name,
            obtainedAt: new Date().toISOString()
        });
        saveJson(inventoryPath, inventory);

        // 5. 결과 임베드 출력 (서버 닉네임 반영 및 등급 색상 분기 가능)
        const embed = {
            title: "가챠 결과 안내",
            description: `${userDisplayName}님이 뽑기 티켓 1장을 사용하여 아래의 아이템을 획득했습니다.`,
            color: 0x5865F2,
            fields: [
                { name: "획득 아이템", value: pickedItem.name, inline: true },
                { name: "등장 확률", value: `${pickedItem.rollbackPercent}%`, inline: true },
                { name: "남은 티켓", value: `${users[userID].Ticket}장`, inline: false }
            ],
            footer: { text: "획득한 아이템은 /보관함 명령어로 확인할 수 있습니다." },
            timestamp: new Date()
        };

        await interaction.reply({ embeds: [embed] });
    }
};
