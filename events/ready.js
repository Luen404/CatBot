const fs = require('fs');
const path = require('path');

client.once('ready', () => {
    console.log(`${client.user.tag} 로그인 완료`);

    const dataDir = path.join(__dirname, 'data');

    // data 폴더 생성
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
        console.log('data 폴더 생성');
    }
const defaultData = {
    'Inventory.json': {},
    'Percent.json': {},
    'PointConfig.json': {},
    'users.json': {},
    'shop.json' : {"items":[]}
};

for (const [file, data] of Object.entries(defaultData)) {
    const filePath = path.join(dataDir, file);

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(
            filePath,
            JSON.stringify(data, null, 4),
            'utf8'
        );
    }
}
