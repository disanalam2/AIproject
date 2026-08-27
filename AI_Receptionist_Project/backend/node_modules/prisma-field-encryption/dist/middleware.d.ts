import type { Configuration, Middleware } from './types';
export declare function fieldEncryptionMiddleware<Models extends string = any, Actions extends string = any>(config?: Configuration): Middleware<Models, Actions>;
