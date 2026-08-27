"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visitOutputTargetFields = exports.visitInputTargetFields = void 0;
const debugger_1 = require("./debugger");
const traverseTree_1 = require("./traverseTree");
const makeVisitor = (models, visitor, specialSubFields, debug) => function visitNode(state, { key, type, node, path }) {
    const model = models[state.currentModel];
    if (!model || !key) {
        return state;
    }
    if (type === 'string' && key in model.fields) {
        const targetField = {
            field: key,
            model: state.currentModel,
            fieldConfig: model.fields[key],
            path: path.join('.'),
            value: node
        };
        debug('Visiting %O', targetField);
        visitor(targetField);
        return state;
    }
    // Special cases: {field}.set for updates, {field}.equals for queries
    for (const specialSubField of specialSubFields) {
        if (type === 'object' &&
            key in model.fields &&
            typeof (node === null || node === void 0 ? void 0 : node[specialSubField]) === 'string') {
            const value = node[specialSubField];
            const targetField = {
                field: key,
                model: state.currentModel,
                fieldConfig: model.fields[key],
                path: [...path, specialSubField].join('.'),
                value
            };
            debug('Visiting %O', targetField);
            visitor(targetField);
            return state;
        }
    }
    if (['object', 'array'].includes(type) && key in model.connections) {
        // Follow the connection: from there on downwards, we're changing models.
        // Return a new object to break from existing references.
        debug(`Changing model: following connection ${state.currentModel}.${key} to model ${model.connections[key].modelName}`);
        return {
            currentModel: model.connections[key].modelName
        };
    }
    return state;
};
function visitInputTargetFields(params, models, visitor) {
    (0, traverseTree_1.traverseTree)(params.args, makeVisitor(models, visitor, ['equals', 'set', 'not'], debugger_1.debug.encryption), {
        currentModel: params.model
    });
}
exports.visitInputTargetFields = visitInputTargetFields;
function visitOutputTargetFields(params, result, models, visitor) {
    (0, traverseTree_1.traverseTree)(result, makeVisitor(models, visitor, [], debugger_1.debug.decryption), {
        currentModel: params.model
    });
}
exports.visitOutputTargetFields = visitOutputTargetFields;
