export interface ProgressReport {
    model: string;
    processed: number;
    totalCount: number;
    performance: number;
}
export type ProgressReportCallback = (progress: ProgressReport) => void | Promise<void>;
export declare const defaultProgressReport: ProgressReportCallback;
