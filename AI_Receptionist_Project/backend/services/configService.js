const prisma = require('../prismaClient');

async function getConfiguration() {
    const configs = await prisma.configuration.findMany();
    const configMap = {};
    configs.forEach(c => configMap[c.key] = c.value);
    return configMap;
}

async function getSecret(key) {
    const secret = await prisma.secret.findUnique({ where: { key } });
    return secret ? secret.value : null;
}

async function setConfiguration(configMap) {
    const promises = Object.keys(configMap).map(key => 
        prisma.configuration.upsert({
            where: { key },
            update: { value: configMap[key] },
            create: { key, value: configMap[key] }
        })
    );
    await Promise.all(promises);
}

async function setSecrets(secretMap) {
    const promises = Object.keys(secretMap).map(key => {
        if (secretMap[key]) {
            return prisma.secret.upsert({
                where: { key },
                update: { value: secretMap[key] },
                create: { key, value: secretMap[key] }
            });
        }
        return Promise.resolve();
    });
    await Promise.all(promises);
}

module.exports = {
    getConfiguration,
    getSecret,
    setConfiguration,
    setSecrets
};
