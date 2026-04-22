use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime,
};

// ─────────────────────────────────────────────
// Data types
// ─────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UsageWindow {
    pub utilization: f64,
    pub resets_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UsageResponse {
    pub five_hour: Option<UsageWindow>,
    pub seven_day: Option<UsageWindow>,
}

#[derive(Debug, Deserialize)]
struct ClaudeCredentials {
    #[serde(rename = "claudeAiOauth")]
    claude_ai_oauth: OAuthData,
}

#[derive(Debug, Deserialize)]
struct OAuthData {
    #[serde(rename = "accessToken")]
    access_token: String,
}

// ─────────────────────────────────────────────
// Credential reading
// ─────────────────────────────────────────────

fn get_access_token() -> anyhow::Result<String> {
    // 1. Try OS keychain first (macOS Keychain / Windows Credential Manager)
    #[cfg(not(target_os = "linux"))]
    {
        let entry = keyring::Entry::new("Claude Code-credentials", "claude")?;
        if let Ok(secret) = entry.get_password() {
            let creds: ClaudeCredentials = serde_json::from_str(&secret)?;
            return Ok(creds.claude_ai_oauth.access_token);
        }
    }

    // 2. Fallback: read from ~/.claude/.credentials.json (Linux / fallback)
    let credentials_path = credentials_file_path()?;
    let contents = std::fs::read_to_string(&credentials_path)?;
    let creds: ClaudeCredentials = serde_json::from_str(&contents)?;
    Ok(creds.claude_ai_oauth.access_token)
}

fn credentials_file_path() -> anyhow::Result<PathBuf> {
    let home = dirs::home_dir().ok_or_else(|| anyhow::anyhow!("No home dir"))?;
    Ok(home.join(".claude").join(".credentials.json"))
}

// ─────────────────────────────────────────────
// Tauri commands
// ─────────────────────────────────────────────

#[tauri::command]
async fn fetch_usage() -> Result<UsageResponse, String> {
    let token = get_access_token().map_err(|e| format!("Auth error: {e}"))?;

    let client = reqwest::Client::new();
    let resp = client
        .get("https://api.anthropic.com/api/oauth/usage")
        .header("Accept", "application/json")
        .header("Content-Type", "application/json")
        .header("User-Agent", "claude-code/2.0.32")
        .header("Authorization", format!("Bearer {token}"))
        .header("anthropic-beta", "oauth-2025-04-20")
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("API error: {}", resp.status()));
    }

    let data: UsageResponse = resp
        .json()
        .await
        .map_err(|e| format!("Parse error: {e}"))?;

    Ok(data)
}

#[tauri::command]
async fn show_context_menu<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    // Context menu is handled by tray, this is a no-op placeholder
    // Right-click on the tray icon shows the menu automatically
    let _ = app;
    Ok(())
}

// ─────────────────────────────────────────────
// App setup
// ─────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![fetch_usage, show_context_menu])
        .setup(|app| {
            // Hide from dock/taskbar — we are a widget only
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            // Build tray menu
            let quit = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
            let refresh = MenuItem::with_id(app, "refresh", "새로고침", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&refresh, &quit])?;

            // Build tray icon
            TrayIconBuilder::new()
                .menu(&menu)
                .menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "refresh" => {
                        // Emit refresh event to frontend
                        let _ = app.emit("refresh", ());
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
