"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug = exports.namespace = void 0;
const debug_1 = __importDefault(require("debug"));
exports.namespace = 'prisma-field-encryption';
exports.debug = {
    setup: (0, debug_1.default)(`${exports.namespace}:setup`),
    runtime: (0, debug_1.default)(`${exports.namespace}:runtime`),
    encryption: (0, debug_1.default)(`${exports.namespace}:encryption`),
    decryption: (0, debug_1.default)(`${exports.namespace}:decryption`)
};
