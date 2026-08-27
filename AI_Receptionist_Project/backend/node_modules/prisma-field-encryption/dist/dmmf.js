"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseHashAnnotation = exports.parseEncryptedAnnotation = exports.analyseDMMF = void 0;
const errors_1 = require("./errors");
const types_1 = require("./types");
const supportedCursorTypes = ['Int', 'String', 'BigInt'];
function analyseDMMF(input) {
    const dmmf = types_1.dmmfDocumentParser.parse(input);
    const allModels = dmmf.datamodel.models;
    return allModels.reduce((output, model) => {
        var _a, _b, _c;
        const idField = model.fields.find(field => field.isId && supportedCursorTypes.includes(String(field.type)));
        const uniqueField = model.fields.find(field => field.isUnique && supportedCursorTypes.includes(String(field.type)));
        const cursorField = model.fields.find(field => { var _a; return (_a = field.documentation) === null || _a === void 0 ? void 0 : _a.includes('@encryption:cursor'); });
        if (cursorField) {
            // Make sure custom cursor field is valid
            if (!cursorField.isUnique) {
                throw new Error(errors_1.errors.nonUniqueCursor(model.name, cursorField.name));
            }
            if (!supportedCursorTypes.includes(String(cursorField.type))) {
                throw new Error(errors_1.errors.unsupportedCursorType(model.name, cursorField.name, String(cursorField.type)));
            }
            if ((_a = cursorField.documentation) === null || _a === void 0 ? void 0 : _a.includes('@encrypted')) {
                throw new Error(errors_1.errors.encryptedCursor(model.name, cursorField.name));
            }
        }
        const modelDescriptor = {
            cursor: (_c = (_b = cursorField === null || cursorField === void 0 ? void 0 : cursorField.name) !== null && _b !== void 0 ? _b : idField === null || idField === void 0 ? void 0 : idField.name) !== null && _c !== void 0 ? _c : uniqueField === null || uniqueField === void 0 ? void 0 : uniqueField.name,
            fields: model.fields.reduce((fields, field) => {
                const fieldConfig = parseEncryptedAnnotation(field.documentation, model.name, field.name);
                if (fieldConfig && field.type !== 'String') {
                    throw new Error(errors_1.errors.unsupportedFieldType(model, field));
                }
                return fieldConfig ? { ...fields, [field.name]: fieldConfig } : fields;
            }, {}),
            connections: model.fields.reduce((connections, field) => {
                const targetModel = allModels.find(model => field.type === model.name);
                if (!targetModel) {
                    return connections;
                }
                const connection = {
                    modelName: targetModel.name,
                    isList: field.isList
                };
                return {
                    ...connections,
                    [field.name]: connection
                };
            }, {})
        };
        // Inject hash information
        model.fields.forEach(field => {
            const hashConfig = parseHashAnnotation(field.documentation, model.name, field.name);
            if (!hashConfig) {
                return;
            }
            if (field.type !== 'String') {
                throw new Error(errors_1.errors.unsupporteHashFieldType(model, field));
            }
            const { sourceField, ...hash } = hashConfig;
            if (!(sourceField in modelDescriptor.fields)) {
                throw new Error(errors_1.errors.hashSourceFieldNotFound(model, field, sourceField));
            }
            modelDescriptor.fields[hashConfig.sourceField].hash = hash;
        });
        if (Object.keys(modelDescriptor.fields).length > 0 &&
            !modelDescriptor.cursor) {
            console.warn(errors_1.warnings.noCursorFound(model.name));
        }
        return {
            ...output,
            [model.name]: modelDescriptor
        };
    }, {});
}
exports.analyseDMMF = analyseDMMF;
// --
const encryptedAnnotationRegex = /@encrypted(?<query>\?[\w=&]+)?/;
const hashAnnotationRegex = /@encryption:hash\((?<fieldName>\w+)\)(?<query>\?[\w=&]+)?/;
function parseEncryptedAnnotation(annotation = '', model, field) {
    var _a, _b, _c;
    const match = annotation.match(encryptedAnnotationRegex);
    if (!match) {
        return null;
    }
    const query = new URLSearchParams((_b = (_a = match.groups) === null || _a === void 0 ? void 0 : _a.query) !== null && _b !== void 0 ? _b : '');
    const strict = query.get('strict') !== null;
    const readonly = query.get('readonly') !== null;
    if (strict && process.env.NODE_ENV === 'development' && model && field) {
        console.warn(errors_1.warnings.deprecatedModeAnnotation(model, field, 'strict'));
    }
    if (readonly && process.env.NODE_ENV === 'development' && model && field) {
        console.warn(errors_1.warnings.deprecatedModeAnnotation(model, field, 'readonly'));
    }
    const mode = (_c = query.get('mode')) !== null && _c !== void 0 ? _c : (readonly ? 'readonly' : strict ? 'strict' : 'default');
    /* istanbul ignore next */
    if (!['default', 'strict', 'readonly'].includes(mode)) {
        if (process.env.NODE_ENV === 'development' && model && field) {
            console.warn(errors_1.warnings.unknownFieldModeAnnotation(model, field, mode));
        }
    }
    return {
        encrypt: mode !== 'readonly',
        strictDecryption: mode === 'strict'
    };
}
exports.parseEncryptedAnnotation = parseEncryptedAnnotation;
function parseHashAnnotation(annotation = '', model, field) {
    var _a, _b, _c, _d, _e, _f, _g;
    const match = annotation.match(hashAnnotationRegex);
    if (!match || !((_a = match.groups) === null || _a === void 0 ? void 0 : _a.fieldName)) {
        return null;
    }
    const query = new URLSearchParams((_b = match.groups.query) !== null && _b !== void 0 ? _b : '');
    const inputEncoding = (_c = query.get('inputEncoding')) !== null && _c !== void 0 ? _c : 'utf8';
    if (!isValidEncoding(inputEncoding) &&
        process.env.NODE_ENV === 'development' &&
        model &&
        field) {
        console.warn(errors_1.warnings.unsupportedEncoding(model, field, inputEncoding, 'input'));
    }
    const outputEncoding = (_d = query.get('outputEncoding')) !== null && _d !== void 0 ? _d : 'hex';
    if (!isValidEncoding(outputEncoding) &&
        process.env.NODE_ENV === 'development' &&
        model &&
        field) {
        console.warn(errors_1.warnings.unsupportedEncoding(model, field, outputEncoding, 'output'));
    }
    const saltEnv = query.get('saltEnv');
    const salt = (_e = query.get('salt')) !== null && _e !== void 0 ? _e : (saltEnv
        ? process.env[saltEnv]
        : process.env.PRISMA_FIELD_ENCRYPTION_HASH_SALT);
    const normalize = (_f = query.getAll('normalize')) !== null && _f !== void 0 ? _f : [];
    if (!isValidNormalizeOptions(normalize) &&
        process.env.NODE_ENV === 'development' &&
        model &&
        field) {
        console.warn(errors_1.warnings.unsupportedNormalize(model, field, normalize));
    }
    if (normalize.length > 0 &&
        inputEncoding !== 'utf8' &&
        process.env.NODE_ENV === 'development' &&
        model &&
        field) {
        console.warn(errors_1.warnings.unsupportedNormalizeEncoding(model, field, inputEncoding));
    }
    return {
        sourceField: match.groups.fieldName,
        targetField: field !== null && field !== void 0 ? field : match.groups.fieldName + 'Hash',
        algorithm: (_g = query.get('algorithm')) !== null && _g !== void 0 ? _g : 'sha256',
        salt,
        inputEncoding,
        outputEncoding,
        normalize
    };
}
exports.parseHashAnnotation = parseHashAnnotation;
function isValidEncoding(encoding) {
    return ['hex', 'base64', 'utf8'].includes(encoding);
}
function isValidNormalizeOptions(options) {
    return options.every(option => option in types_1.HashFieldNormalizeOptions);
}
