import { PrismaClient } from '@prisma/client';
import { fieldEncryptionExtension } from 'prisma-field-encryption';

const client = new PrismaClient();
const prisma = client.$extends(fieldEncryptionExtension());

export default prisma;
