const { PrismaClient } = require('@prisma/client');
const { fieldEncryptionExtension } = require('prisma-field-encryption');

const globalClient = new PrismaClient();
const prisma = globalClient.$extends(fieldEncryptionExtension());

module.exports = prisma;
