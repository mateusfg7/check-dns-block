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
        /// Set when the reference DNS was requested but dropped.
        warning: Option<String>,
    },
    Row(CheckRow),
    Finished,
}

fn parse_server(raw: &str, error: &str) -> Result<IpAddr, String> {
    raw.trim().parse().map_err(|_| error.to_string())
}

/// Runs a preflight query for [`CONTROL_DOMAIN`] against `resolver`, mirroring
/// the original tool's "is this server even reachable from here" check.
async fn is_server_reachable(resolver: &hickory_resolver::TokioResolver) -> bool {
    let control = Entry {
        name: CONTROL_DOMAIN.to_string(),
        kind: EntryKind::Domain,
    };
    matches!(dns::query(resolver, &control).await, Answer::Ok(_))
}

/// Parses, preflights and resolves every entry in `input` against `server`
/// (and, optionally, `reference`), streaming progress over `on_event`.
/// Mirrors the window workflow in the original `.cmd` tool.
#[tauri::command]
async fn check(
    input: String,
    server: String,
    reference: Option<String>,
    on_event: Channel<CheckEvent>,
) -> Result<(), String> {
    let server_ip = parse_server(&server, "Informe o IP do servidor DNS a consultar.")?;
    let mut reference_ip = match reference.as_deref().map(str::trim) {
        None | Some("") => None,
        Some(raw) => Some(parse_server(
            raw,
            "Informe o IP do DNS público de comparação ou desmarque a opção.",
        )?),
    };

    let parsed = dns::parse_entries(&input);
    if parsed.entries.is_empty() {
        return Err("Cole pelo menos um domínio ou IP válido.".to_string());
    }

    let target_resolver = dns::build_resolver(server_ip)?;
    if !is_server_reachable(&target_resolver).await {
        return Err(format!(
            "O servidor {server_ip} não respondeu a consulta de teste ({CONTROL_DOMAIN}).\n\n\
             Este computador precisa estar na rede atendida por esse DNS."
        ));
    }

    let mut warning = None;
    let reference_resolver = match reference_ip {
        Some(ip) => {
            let resolver = dns::build_resolver(ip)?;
            if is_server_reachable(&resolver).await {
                Some(resolver)
            } else {
                warning = Some(format!(
                    "O DNS público {ip} não respondeu daqui. A verificação segue sem comparação: \
                     o que não resolver aparece como NÃO RESOLVE."
                ));
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
        .map_err(|e| e.to_string())?;

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
            let checked_at = chrono::Local::now().format("%d/%m/%Y %H:%M:%S").to_string();
            CheckRow {
                index,
                target_answer: dns::answer_text(&target_answer, entry.kind),
                reference_answer: reference_answer.map(|a| dns::answer_text(&a, entry.kind)),
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
) -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter(&filter_name, &[extension.as_str()])
        .save_file(move |path| {
            let _ = tx.send(path);
        });

    let Some(path) = rx
        .await
        .map_err(|_| "Falha ao abrir a caixa de diálogo.".to_string())?
    else {
        return Ok(None);
    };
    let path = path.into_path().map_err(|e| e.to_string())?;

    let mut bytes = Vec::with_capacity(contents.len() + 3);
    if bom {
        bytes.extend_from_slice(&[0xEF, 0xBB, 0xBF]);
    }
    bytes.extend_from_slice(contents.as_bytes());

    tokio::fs::write(&path, bytes)
        .await
        .map_err(|e| format!("Não foi possível salvar: {e}"))?;

    Ok(Some(path.display().to_string()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![app_info, check, save_text_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
