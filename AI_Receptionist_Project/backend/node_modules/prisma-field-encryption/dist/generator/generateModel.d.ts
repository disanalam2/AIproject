import type { DMMFModelDescriptor } from '../dmmf';
export interface GenerateModelArgs {
    modelName: string;
    model: DMMFModelDescriptor;
    prismaClientModule: string;
    outputDir: string;
}
export declare function generateModel({ modelName, model, prismaClientModule, outputDir }: GenerateModelArgs): Promise<void>;
