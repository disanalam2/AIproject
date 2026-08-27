#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const generator_helper_1 = require("@prisma/generator-helper");
const promises_1 = __importDefault(require("node:fs/promises"));
const posix_1 = __importDefault(require("path/posix"));
const dmmf_1 = require("../dmmf");
const generateIndex_1 = require("./generateIndex");
const generateModel_1 = require("./generateModel");
(0, generator_helper_1.generatorHandler)({
    onManifest() {
        return {
            prettyName: 'field-level encryption migrations',
            version: require('../../package.json').version,
            requiresGenerators: ['prisma-client-js'],
            defaultOutput: 'migrations'
        };
    },
    async onGenerate(options) {
        var _a, _b, _c, _d;
        const models = (0, dmmf_1.analyseDMMF)(options.dmmf);
        const outputDir = (_a = options.generator.output) === null || _a === void 0 ? void 0 : _a.value;
        const concurrently = ((_b = options.generator.config) === null || _b === void 0 ? void 0 : _b.concurrently) === 'true';
        const prismaClient = options.otherGenerators.find(each => each.provider.value === 'prisma-client-js');
        // mkdir -p
        try {
            await promises_1.default.mkdir(outputDir, { recursive: true });
        }
        catch (_e) { }
        // Keep only models with encrypted fields & a valid cursor
        const validModels = Object.fromEntries(Object.entries(models).filter(([, model]) => Object.keys(model.fields).length > 0 && Boolean(model.cursor)));
        const prismaClientOutput = (_d = (_c = prismaClient.output) === null || _c === void 0 ? void 0 : _c.value) !== null && _d !== void 0 ? _d : 'node_modules/@prisma/client';
        const prismaClientModule = prismaClientOutput.endsWith('node_modules/@prisma/client')
            ? '@prisma/client'
            : posix_1.default.relative(outputDir, prismaClientOutput);
        const longestModelNameLength = Object.keys(validModels).reduce((max, model) => Math.max(max, model.length), 0);
        await Promise.all(Object.entries(validModels).map(([modelName, model]) => (0, generateModel_1.generateModel)({
            modelName,
            model,
            outputDir,
            prismaClientModule
        })));
        await (0, generateIndex_1.generateIndex)({
            concurrently,
            models: validModels,
            outputDir,
            prismaClientModule,
            modelNamePad: longestModelNameLength
        });
    }
});
