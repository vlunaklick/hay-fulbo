import {
  HistoryImportError,
  importHistoricalMatches,
  parseHistoryImportPayload,
} from "./history-import";

const rawPayload = process.env.HAY_FULBO_HISTORY_IMPORT_JSON;
const connectionString = process.env.MIGRATION_DATABASE_URL;

if (!rawPayload || !connectionString) {
  process.stderr.write("history_import_error:missing_environment\n");
  process.exitCode = 1;
} else {
  try {
    const payload = parseHistoryImportPayload(rawPayload);
    const summary = await importHistoricalMatches({ connectionString, payload });
    process.stdout.write(`${JSON.stringify(summary)}\n`);
  } catch (error) {
    const code = error instanceof HistoryImportError ? error.code : "database_error";
    process.stderr.write(`history_import_error:${code}\n`);
    process.exitCode = 1;
  }
}
