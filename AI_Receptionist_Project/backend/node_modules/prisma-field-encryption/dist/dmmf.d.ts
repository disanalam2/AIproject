import { DMMFDocument, FieldConfiguration, HashFieldConfiguration } from './types';
export interface ConnectionDescriptor {
    modelName: string;
    isList: boolean;
}
export interface DMMFModelDescriptor {
    /**
     * The field to use to iterate over rows
     * in encryption/decryption/key rotation migrations.
     *
     * See https://github.com/47ng/prisma-field-encryption#migrations
     */
    cursor?: string;
    fields: Record<string, FieldConfiguration>;
    connections: Record<string, ConnectionDescriptor>;
}
export type DMMFModels = Record<string, DMMFModelDescriptor>;
export declare function analyseDMMF(input: DMMFDocument): DMMFModels;
export declare function parseEncryptedAnnotation(annotation?: string, model?: string, field?: string): FieldConfiguration | null;
export declare function parseHashAnnotation(annotation?: string, model?: string, field?: string): HashFieldConfiguration | null;
