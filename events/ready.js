const fs = require('fs');
const path = require('path');
const loadCommands = require('../Handler/commandHandler');

module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        console.log(`로그인 => ${client.user.tag}`);

        const dataPath = path.join(process.cwd(), 'data');

        if (!fs.existsSync(dataPath)) {
            fs.mkdirSync(dataPath, { recursive: true });
            console.log('data 폴더 생성');
        }

        const files = [
            'Inventory.json',
            'Percent.json',
            'PointConfig.json',
            'users.json'
        ];

        for (const file of files) {
            const filePath = path.join(dataPath, file);

            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(
                    filePath,
                    JSON.stringify({}, null, 4),
                    'utf8'
                );
                console.log(`${file} 생성`);
            }
        }

        await loadCommands(client);
    },
};