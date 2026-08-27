"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultProgressReport = void 0;
const defaultProgressReport = ({ model, totalCount, processed, performance }) => {
    const length = totalCount.toString().length;
    const pct = Math.round((100 * processed) / totalCount)
        .toString()
        .padStart(3);
    console.info(`${model.padEnd(32)} ${pct}% processed ${processed
        .toString()
        .padStart(length)} / ${totalCount} (took ${performance.toFixed(2)}ms)`);
};
exports.defaultProgressReport = defaultProgressReport;
