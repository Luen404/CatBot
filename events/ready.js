const loadCommands = require(`../Handler/commandHandler`);

module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        console.log(`로그인 => ${client.user.tag}`);

        await loadCommands(client);
    },
};