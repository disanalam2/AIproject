import type { DMMFModels } from '../dmmf';
export interface GenerateIndexArgs {
    models: DMMFModels;
    prismaClientModule: string;
    outputDir: string;
    modelNamePad: number;
    concurrently: boolean;
}
export declare function generateIndex({ concurrently, models, outputDir, modelNamePad, prismaClientModule }: GenerateIndexArgs): Promise<void>;
