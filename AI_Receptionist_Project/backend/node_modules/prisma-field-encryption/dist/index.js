"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fieldEncryptionMiddleware = exports.fieldEncryptionExtension = void 0;
var extension_1 = require("./extension"); // Prisma >= 4.7.0
Object.defineProperty(exports, "fieldEncryptionExtension", { enumerable: true, get: function () { return extension_1.fieldEncryptionExtension; } });
var middleware_1 = require("./middleware"); // Prisma >= 3.8
Object.defineProperty(exports, "fieldEncryptionMiddleware", { enumerable: true, get: function () { return middleware_1.fieldEncryptionMiddleware; } });
