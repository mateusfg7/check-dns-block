mod dns;

use std::net::IpAddr;
use std::pin::pin;

use dns::{Answer, CheckRow, Entry, EntryKind};
use futures::{StreamExt, stream};
use serde::Serialize;
use tauri::ipc::Channel;
use tauri_plugin_dialog::DialogExt;

/// Static info the frontend header displays (DNS servers, app version).
const DEFAULT_ISP_DNS: &str = "177.137.208.6";
const DEFAULT_PUBLIC_DNS: &str = "8.8.8.8";
/// Name that must resolve for a DNS server to be considered reachable.
const CONTROL_DOMAIN: &str = "google.com";
/// How many lookups run at once against each server.
const CONCURRENCY: usize = 16;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppInfo {
    version: String,
    isp_dns: String,
    public_dns: String,
}

#[tauri::command]
fn app_info() -> AppInfo {
    AppInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        isp_dns: DEFAULT_ISP_DNS.to_string(),
        public_dns: DEFAULT_PUBLIC_DNS.to_string(),
    }
}

/// Set on `CheckEvent::Started` when the reference DNS was requested but
/// dropped because it failed its own preflight check. The frontend renders
/// this (and every error/warning below) in the current UI language.
#[derive(Debug, Clone, Serialize)]
#[serde(
    tag = "code",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
enum CheckWarning {
    ReferenceUnreachable { server: String },
}

/// Streamed over the `check` command's channel so the UI can render rows as
/// they arrive instead of waiting for every query to finish.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "type")]
enum CheckEvent {
    Started {
        total: usize,
        ignored: usize,
        /// The reference DNS actually used, or `None` if it was dropped
        /// (missing, or it failed its own preflight check).
        reference: Option<String>,
        warning: Option<CheckWarning>,
    },
    Row(CheckRow),
    Finished,
}

/// Returned to the frontend when the `check` command fails. Structured
/// instead of a ready-made message, so the UI can render it translated.
#[derive(Debug, Clone, Serialize)]
#[serde(
    tag = "code",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
enum CheckError {
    InvalidServer,
    InvalidReference,
    NoEntries,
    ServerUnreachable { server: String, control: String },
    Internal { message: String },
}

fn parse_server(raw: &str, error: CheckError) -> Result<IpAddr, CheckError> {
    raw.trim().parse().map_err(|_| error)
}

/// Runs a preflight query for [`CONTROL_DOMAIN`] against `resolver`, to check
/// whether the server is even reachable from here.
async fn is_server_reachable(resolver: &hickory_resolver::TokioResolver) -> bool {
    let control = Entry {
        name: CONTROL_DOMAIN.to_string(),
        kind: EntryKind::Domain,
    };
    matches!(dns::query(resolver, &control).await, Answer::Ok(_))
}

/// Parses, preflights and resolves every entry in `input` against `server`
/// (and, optionally, `reference`), streaming progress over `on_event`.
#[tauri::command]
async fn check(
    input: String,
    server: String,
    reference: Option<String>,
    on_event: Channel<CheckEvent>,
) -> Result<(), CheckError> {
    let server_ip = parse_server(&server, CheckError::InvalidServer)?;
    let mut reference_ip = match reference.as_deref().map(str::trim) {
        None | Some("") => None,
        Some(raw) => Some(parse_server(raw, CheckError::InvalidReference)?),
    };

    let parsed = dns::parse_entries(&input);
    if parsed.entries.is_empty() {
        return Err(CheckError::NoEntries);
    }

    let target_resolver =
        dns::build_resolver(server_ip).map_err(|message| CheckError::Internal { message })?;
    if !is_server_reachable(&target_resolver).await {
        return Err(CheckError::ServerUnreachable {
            server: server_ip.to_string(),
            control: CONTROL_DOMAIN.to_string(),
        });
    }

    let mut warning = None;
    let reference_resolver = match reference_ip {
        Some(ip) => {
            let resolver =
                dns::build_resolver(ip).map_err(|message| CheckError::Internal { message })?;
            if is_server_reachable(&resolver).await {
                Some(resolver)
            } else {
                warning = Some(CheckWarning::ReferenceUnreachable {
                    server: ip.to_string(),
                });
                reference_ip = None;
                None
            }
        }
        None => None,
    };

    on_event
        .send(CheckEvent::Started {
            total: parsed.entries.len(),
            ignored: parsed.ignored,
            reference: reference_ip.map(|ip| ip.to_string()),
            warning,
        })
        .map_err(|e| CheckError::Internal {
            message: e.to_string(),
        })?;

    let target_resolver = &target_resolver;
    let reference_resolver = &reference_resolver;
    let rows =
        stream::iter(parsed.entries.into_iter().enumerate()).map(|(index, entry)| async move {
            let target_answer = dns::query(target_resolver, &entry).await;
            let reference_answer = match reference_resolver {
                Some(resolver) => Some(dns::query(resolver, &entry).await),
                None => None,
            };
            let verdict = dns::classify(entry.kind, &target_answer, reference_answer.as_ref());
            let checked_at = chrono::Local::now().timestamp_millis();
            CheckRow {
                index,
                target_answer,
                reference_answer,
                entry: entry.name,
                kind: entry.kind,
                verdict,
                checked_at,
            }
        });
    let mut rows = pin!(rows.buffer_unordered(CONCURRENCY));

    while let Some(row) = rows.next().await {
        // A send failure means the frontend went away; stop quietly rather
        // than spamming further sends that will fail too.
        if on_event.send(CheckEvent::Row(row)).is_err() {
            return Ok(());
        }
    }

    let _ = on_event.send(CheckEvent::Finished);
    Ok(())
}

/// Returned to the frontend when the `save_text_file` command fails.
#[derive(Debug, Clone, Serialize)]
#[serde(
    tag = "code",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
enum SaveError {
    DialogFailed,
    WriteFailed { message: String },
}

/// Opens a native "save file" dialog pre-filled with `default_name`, then
/// writes `contents` to the chosen path (UTF-8, with a BOM when `bom` is
/// true — Excel needs it to open accented CSVs correctly). Returns the
/// chosen path, or `None` if the dialog was cancelled.
#[tauri::command]
async fn save_text_file(
    app: tauri::AppHandle,
    default_name: String,
    filter_name: String,
    extension: String,
    contents: String,
    bom: bool,
) -> Result<Option<String>, SaveError> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter(&filter_name, &[extension.as_str()])
        .save_file(move |path| {
            let _ = tx.send(path);
        });

    let Some(path) = rx.await.map_err(|_| SaveError::DialogFailed)? else {
        return Ok(None);
    };
    let path = path.into_path().map_err(|e| SaveError::WriteFailed {
        message: e.to_string(),
    })?;

    let mut bytes = Vec::with_capacity(contents.len() + 3);
    if bom {
        bytes.extend_from_slice(&[0xEF, 0xBB, 0xBF]);
    }
    bytes.extend_from_slice(contents.as_bytes());

    tokio::fs::write(&path, bytes)
        .await
        .map_err(|e| SaveError::WriteFailed {
            message: e.to_string(),
        })?;

    Ok(Some(path.display().to_string()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![app_info, check, save_text_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn check_error_serializes_as_tagged_struct() {
        assert_eq!(
            serde_json::to_string(&CheckError::InvalidServer).unwrap(),
            r#"{"code":"invalid_server"}"#
        );
        assert_eq!(
            serde_json::to_string(&CheckError::ServerUnreachable {
                server: "1.2.3.4".into(),
                control: "google.com".into(),
            })
            .unwrap(),
            r#"{"code":"server_unreachable","server":"1.2.3.4","control":"google.com"}"#
        );
    }

    #[test]
    fn check_warning_serializes_as_tagged_struct() {
        assert_eq!(
            serde_json::to_string(&CheckWarning::ReferenceUnreachable {
                server: "8.8.8.8".into(),
            })
            .unwrap(),
            r#"{"code":"reference_unreachable","server":"8.8.8.8"}"#
        );
    }

    #[test]
    fn save_error_serializes_as_tagged_struct() {
        assert_eq!(
            serde_json::to_string(&SaveError::DialogFailed).unwrap(),
            r#"{"code":"dialog_failed"}"#
        );
        assert_eq!(
            serde_json::to_string(&SaveError::WriteFailed {
                message: "boom".into(),
            })
            .unwrap(),
            r#"{"code":"write_failed","message":"boom"}"#
        );
    }
}
