import { Configuration } from './types';
export declare function fieldEncryptionExtension<Models extends string = any, Actions extends string = any>(config?: Configuration): (client: any) => import("@prisma/client/extension").PrismaClientExtends<import("@prisma/client/runtime/library").InternalArgs<{}, {}, {}, {}>>;
