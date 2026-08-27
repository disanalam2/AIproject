"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visitRecords = void 0;
const progressReport_1 = require("./progressReport");
async function visitRecords({ modelName, client, getTotalCount, migrateRecord, reportProgress = progressReport_1.defaultProgressReport }) {
    const totalCount = await getTotalCount();
    if (totalCount === 0) {
        return 0;
    }
    let cursor = undefined;
    let processed = 0;
    while (true) {
        const tick = performance.now();
        const newCursor = await migrateRecord(client, cursor);
        if (newCursor === cursor) {
            break; // Reached the end
        }
        cursor = newCursor;
        processed++;
        const tock = performance.now();
        reportProgress({
            model: modelName,
            processed,
            totalCount,
            performance: tock - tick
        });
    }
    return processed;
}
exports.visitRecords = visitRecords;
