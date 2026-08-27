"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warnings = exports.errors = void 0;
const debugger_1 = require("./debugger");
const types_1 = require("./types");
const error = `[${debugger_1.namespace}] Error`;
const warning = `[${debugger_1.namespace}] Warning`;
exports.errors = {
    // Setup errors
    noEncryptionKey: `${error}: no encryption key provided.`,
    unsupportedFieldType: (model, field) => `${error}: encryption enabled for field ${model.name}.${field.name} of unsupported type ${field.type}: only String fields can be encrypted.`,
    unsupporteHashFieldType: (model, field) => `${error}: hash enabled for field ${model.name}.${field.name} of unsupported type ${field.type}: only String fields can contain hashes.`,
    hashSourceFieldNotFound: (model, hashField, sourceField) => `${error}: no such field \`${sourceField}\` in ${model.name}
  -> Referenced by hash field ${model.name}.${hashField.name}`,
    // Runtime errors
    fieldEncryptionError: (model, field, path, error) => `Encryption error for ${model}.${field} at ${path}: ${error}`,
    encryptionErrorReport: (operation, errors) => `${error}: encryption error(s) encountered in operation ${operation}:
  ${errors.join('\n  ')}`,
    fieldDecryptionError: (model, field, path, error) => `Decryption error for ${model}.${field} at ${path}: ${error}`,
    decryptionErrorReport: (operation, errors) => `${error}: decryption error(s) encountered in operation ${operation}:
  ${errors.join('\n  ')}`,
    orderByUnsupported: (model, field) => `${error}: Running \`orderBy\` on encrypted field ${model}.${field} is not supported (results won't be sorted).
  See: https://github.com/47ng/prisma-field-encryption/issues/43
`,
    // Generator errors
    nonUniqueCursor: (model, field) => `${error}: the cursor field ${model}.${field} should have a @unique attribute.
  Read more: https://github.com/47ng/prisma-field-encryption#custom-cursors`,
    unsupportedCursorType: (model, field, type) => `${error}: the cursor field ${model}.${field} has an unsupported type ${type}.
  Only String and Int cursors are supported.
  Read more: https://github.com/47ng/prisma-field-encryption#custom-cursors`,
    encryptedCursor: (model, field) => `${error}: the field ${model}.${field} cannot be used as a cursor as it is encrypted.
  Read more: https://github.com/47ng/prisma-field-encryption#custom-cursors`
};
exports.warnings = {
    // Setup warnings
    deprecatedModeAnnotation: (model, field, mode) => `${warning}: deprecated annotation \`/// @encrypted?${mode}\` on field ${model}.${field}.
  -> Please replace with /// @encrypted?mode=${mode}
  (support for undocumented annotations will be removed in a future update)`,
    unknownFieldModeAnnotation: (model, field, mode) => `${warning}: the field ${model}.${field} defines an unknown mode \`${mode}\`.
  Accepted modes are \`strict\` or \`readonly\`.`,
    noCursorFound: (model) => `${warning}: could not find a field to use to iterate over rows in model ${model}.
  Automatic encryption/decryption/key rotation migrations are disabled for this model.
  Read more: https://github.com/47ng/prisma-field-encryption#migrations`,
    // Runtime warnings
    whereConnectClauseNoHash: (operation, path) => `${warning}: you're using an encrypted field in a \`where\` or \`connect\` clause without a hash.
  -> In ${operation}: ${path}
  This will not work as-is, read more: https://github.com/47ng/prisma-field-encryption#caveats--limitations
  Consider adding a hash field to enable searching encrypted fields:
  https://github.com/47ng/prisma-field-encryption#enable-search-with-hashes
  `,
    unsupportedHashAlgorithm: (model, field, algorithm) => `${warning}: unsupported hash algorithm \`${algorithm}\` for hash field ${model}.${field}
  -> Valid values are algorithms accepted by Node's crypto.createHash:
  https://nodejs.org/dist/latest-v16.x/docs/api/crypto.html#cryptocreatehashalgorithm-options
`,
    unsupportedEncoding: (model, field, encoding, io) => `${warning}: unsupported ${io} encoding \`${encoding}\` for hash field ${model}.${field}
  -> Valid values are utf8, base64, hex
`,
    unsupportedNormalize: (model, field, normalize) => `${warning}: unsupported normalize \`${normalize}\` for hash field ${model}.${field}
  -> Valid values are ${Object.values(types_1.HashFieldNormalizeOptions)}
`,
    unsupportedNormalizeEncoding: (model, field, inputEncoding) => `${warning}: unsupported normalize flag on field with encoding \`${inputEncoding}\` for hash field ${model}.${field}
-> Valid inputEncoding values for normalize are [utf8]
`
};
