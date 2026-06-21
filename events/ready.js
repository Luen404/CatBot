const defaultData = {
    'Inventory.json': {},
    'Percent.json': {},
    'PointConfig.json': {},
    'users.json': {},
    'shop.json' : {items:[]}
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
