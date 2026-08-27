"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fieldEncryptionMiddleware = void 0;
const debugger_1 = require("./debugger");
const dmmf_1 = require("./dmmf");
const encryption_1 = require("./encryption");
function fieldEncryptionMiddleware(config = {}) {
    var _a;
    // This will throw if the encryption key is missing
    // or if anything is invalid.
    const keys = (0, encryption_1.configureKeys)(config);
    debugger_1.debug.setup('Keys: %O', keys);
    const models = (0, dmmf_1.analyseDMMF)((_a = config.dmmf) !== null && _a !== void 0 ? _a : require('@prisma/client').Prisma.dmmf);
    debugger_1.debug.setup('Models: %O', models);
    return async function fieldEncryptionMiddleware(params, next) {
        if (!params.model) {
            // Unsupported operation
            debugger_1.debug.runtime('Unsupported operation (missing model): %O', params);
            return await next(params);
        }
        const operation = `${params.model}.${params.action}`;
        // Params are mutated in-place for modifications to occur.
        // See https://github.com/prisma/prisma/issues/9522
        const encryptedParams = (0, encryption_1.encryptOnWrite)(params, keys, models, operation);
        let result = await next(encryptedParams);
        (0, encryption_1.decryptOnRead)(encryptedParams, result, keys, models, operation);
        return result;
    };
}
exports.fieldEncryptionMiddleware = fieldEncryptionMiddleware;
