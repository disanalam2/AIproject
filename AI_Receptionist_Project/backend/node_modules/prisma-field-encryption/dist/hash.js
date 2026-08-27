"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeHashString = exports.hashString = void 0;
const codec_1 = require("@47ng/codec");
const node_crypto_1 = __importDefault(require("node:crypto"));
const types_1 = require("./types");
function hashString(input, config) {
    const decode = codec_1.decoders[config.inputEncoding];
    const encode = codec_1.encoders[config.outputEncoding];
    const normalized = normalizeHashString(input, config.normalize);
    const data = decode(normalized);
    const hash = node_crypto_1.default.createHash(config.algorithm);
    hash.update(data);
    if (config.salt) {
        hash.update(decode(config.salt));
    }
    return encode(hash.digest());
}
exports.hashString = hashString;
function normalizeHashString(input, options = []) {
    let output = input;
    if (options.includes(types_1.HashFieldNormalizeOptions.lowercase)) {
        output = output.toLowerCase();
    }
    if (options.includes(types_1.HashFieldNormalizeOptions.uppercase)) {
        output = output.toUpperCase();
    }
    if (options.includes(types_1.HashFieldNormalizeOptions.trim)) {
        output = output.trim();
    }
    if (options.includes(types_1.HashFieldNormalizeOptions.spaces)) {
        output = output.replace(/\s/g, '');
    }
    if (options.includes(types_1.HashFieldNormalizeOptions.diacritics)) {
        output = output.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    return output;
}
exports.normalizeHashString = normalizeHashString;
