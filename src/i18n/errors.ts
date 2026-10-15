/** Renders the structured errors/warnings from the backend (and `lib/ipc.ts`'s
 * browser-only fallbacks) as localized text. */
import type { CheckError, CheckWarning, SaveError } from "../lib/types";
import type { Messages } from "./locales/en";

export function errorText(error: CheckError, t: Messages): string {
  switch (error.code) {
    case "invalid_server":
      return t.errors.invalidServer;
    case "invalid_reference":
      return t.errors.invalidReference;
    case "no_entries":
      return t.errors.noEntries;
    case "server_unreachable":
      return t.errors.serverUnreachable(error.server, error.control);
    case "internal":
      return t.errors.internal(error.message);
    case "not_in_app":
      return t.errors.notInApp;
  }
}

export function warningText(warning: CheckWarning, t: Messages): string {
  switch (warning.code) {
    case "reference_unreachable":
      return t.warnings.referenceUnreachable(warning.server);
  }
}

export function saveErrorText(error: SaveError, t: Messages): string {
  switch (error.code) {
    case "dialog_failed":
      return t.saveErrors.dialogFailed;
    case "write_failed":
      return t.saveErrors.writeFailed(error.message);
    case "not_in_app":
      return t.saveErrors.notInApp;
  }
}
