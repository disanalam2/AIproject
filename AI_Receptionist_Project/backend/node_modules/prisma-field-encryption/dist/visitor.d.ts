import { DMMFModels } from './dmmf';
import type { FieldConfiguration, MiddlewareParams } from './types';
export interface TargetField {
    path: string;
    value: string;
    model: string;
    field: string;
    fieldConfig: FieldConfiguration;
}
export type TargetFieldVisitorFn = (targetField: TargetField) => void;
export declare function visitInputTargetFields<Models extends string, Actions extends string>(params: MiddlewareParams<Models, Actions>, models: DMMFModels, visitor: TargetFieldVisitorFn): void;
export declare function visitOutputTargetFields<Models extends string, Actions extends string>(params: MiddlewareParams<Models, Actions>, result: any, models: DMMFModels, visitor: TargetFieldVisitorFn): void;
