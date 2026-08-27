import { ProgressReportCallback } from './progressReport';
export type RecordVisitor<PrismaClient, Cursor> = (client: PrismaClient, cursor: Cursor | undefined) => Promise<Cursor | undefined>;
export interface VisitRecordsArgs<PrismaClient, Cursor> {
    modelName: string;
    client: PrismaClient;
    getTotalCount: () => Promise<number>;
    migrateRecord: RecordVisitor<PrismaClient, Cursor>;
    reportProgress?: ProgressReportCallback;
}
export declare function visitRecords<PrismaClient, Cursor>({ modelName, client, getTotalCount, migrateRecord, reportProgress }: VisitRecordsArgs<PrismaClient, Cursor>): Promise<number>;
