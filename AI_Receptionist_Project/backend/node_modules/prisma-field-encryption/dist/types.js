"use strict";
/**
 * Prisma types --
 *
 * We're copying just what we need for local type safety
 * without importing Prisma-generated types, as the location
 * of the generated client can be unknown (when using custom
 * or multiple client locations).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HashFieldNormalizeOptions = exports.dmmfDocumentParser = void 0;
const zod_1 = require("zod");
const dmmfFieldParser = zod_1.z
    .object({
    name: zod_1.z.string(),
    isList: zod_1.z.boolean(),
    isUnique: zod_1.z.boolean(),
    isId: zod_1.z.boolean(),
    type: zod_1.z.any(),
    documentation: zod_1.z.string().optional()
})
    .readonly();
const dmmfModelParser = zod_1.z
    .object({
    name: zod_1.z.string(),
    fields: zod_1.z.array(dmmfFieldParser).readonly()
})
    .readonly();
exports.dmmfDocumentParser = zod_1.z
    .object({
    datamodel: zod_1.z
        .object({
        models: zod_1.z.array(dmmfModelParser).readonly()
    })
        .readonly()
})
    .readonly();
var HashFieldNormalizeOptions;
(function (HashFieldNormalizeOptions) {
    HashFieldNormalizeOptions["lowercase"] = "lowercase";
    HashFieldNormalizeOptions["uppercase"] = "uppercase";
    HashFieldNormalizeOptions["trim"] = "trim";
    HashFieldNormalizeOptions["spaces"] = "spaces";
    HashFieldNormalizeOptions["diacritics"] = "diacritics";
})(HashFieldNormalizeOptions || (exports.HashFieldNormalizeOptions = HashFieldNormalizeOptions = {}));
