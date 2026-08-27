import { type DMMFField, type DMMFModel } from './types';
export declare const errors: {
    noEncryptionKey: string;
    unsupportedFieldType: (model: DMMFModel, field: DMMFField) => string;
    unsupporteHashFieldType: (model: DMMFModel, field: DMMFField) => string;
    hashSourceFieldNotFound: (model: DMMFModel, hashField: DMMFField, sourceField: string) => string;
    fieldEncryptionError: (model: string, field: string, path: string, error: any) => string;
    encryptionErrorReport: (operation: string, errors: string[]) => string;
    fieldDecryptionError: (model: string, field: string, path: string, error: any) => string;
    decryptionErrorReport: (operation: string, errors: string[]) => string;
    orderByUnsupported: (model: string, field: string) => string;
    nonUniqueCursor: (model: string, field: string) => string;
    unsupportedCursorType: (model: string, field: string, type: string) => string;
    encryptedCursor: (model: string, field: string) => string;
};
export declare const warnings: {
    deprecatedModeAnnotation: (model: string, field: string, mode: string) => string;
    unknownFieldModeAnnotation: (model: string, field: string, mode: string) => string;
    noCursorFound: (model: string) => string;
    whereConnectClauseNoHash: (operation: string, path: string) => string;
    unsupportedHashAlgorithm: (model: string, field: string, algorithm: string) => string;
    unsupportedEncoding: (model: string, field: string, encoding: string, io: string) => string;
    unsupportedNormalize: (model: string, field: string, normalize: string) => string;
    unsupportedNormalizeEncoding: (model: string, field: string, inputEncoding: string) => string;
};
