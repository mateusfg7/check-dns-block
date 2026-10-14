mod dns;

use serde::Serialize;

/// Static info the frontend header displays (DNS servers, app version).
/// This is placeholder data; the DNS servers will become user-configurable.
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
        isp_dns: "177.137.208.6".to_string(),
        public_dns: "8.8.8.8".to_string(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_info])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
