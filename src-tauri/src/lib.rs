use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime,
};
use tauri_plugin_shell::ShellExt;

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
// Credential reading / writing
// ─────────────────────────────────────────────

fn get_access_token() -> anyhow::Result<String> {
    #[cfg(not(target_os = "linux"))]
    {
        let entry = keyring::Entry::new("Claude Code-credentials", "claude")?;
        if let Ok(secret) = entry.get_password() {
            let creds: ClaudeCredentials = serde_json::from_str(&secret)?;
            return Ok(creds.claude_ai_oauth.access_token);
        }
    }

    let credentials_path = credentials_file_path()?;
    let contents = std::fs::read_to_string(&credentials_path)?;
    let creds: ClaudeCredentials = serde_json::from_str(&contents)?;
    Ok(creds.claude_ai_oauth.access_token)
}

fn credentials_file_path() -> anyhow::Result<PathBuf> {
    let home = dirs::home_dir().ok_or_else(|| anyhow::anyhow!("No home dir"))?;
    Ok(home.join(".claude").join(".credentials.json"))
}

fn clear_credentials() {
    #[cfg(not(target_os = "linux"))]
    {
        if let Ok(entry) = keyring::Entry::new("Claude Code-credentials", "claude") {
            let _ = entry.delete_credential();
        }
    }
    if let Ok(path) = credentials_file_path() {
        let _ = std::fs::remove_file(&path);
    }
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
async fn get_auth_status() -> bool {
    get_access_token().is_ok()
}

#[tauri::command]
async fn logout(app: AppHandle) -> Result<(), String> {
    clear_credentials();
    let _ = app.emit("auth_changed", ());
    Ok(())
}

#[tauri::command]
async fn show_context_menu<R: Runtime>(
    app: AppHandle<R>,
    window: tauri::WebviewWindow<R>,
) -> Result<(), String> {
    let is_logged_in = get_access_token().is_ok();

    let refresh = MenuItem::with_id(&app, "ctx_refresh", "새로고침", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let sep1 = PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?;
    let auth_item = if is_logged_in {
        MenuItem::with_id(&app, "ctx_logout", "로그아웃", true, None::<&str>)
            .map_err(|e| e.to_string())?
    } else {
        MenuItem::with_id(&app, "ctx_login", "로그인", true, None::<&str>)
            .map_err(|e| e.to_string())?
    };
    let sep2 = PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?;
    let quit = MenuItem::with_id(&app, "ctx_quit", "종료", true, None::<&str>)
        .map_err(|e| e.to_string())?;

    let menu = Menu::with_items(&app, &[&refresh, &sep1, &auth_item, &sep2, &quit])
        .map_err(|e| e.to_string())?;

    window.popup_menu(&menu).map_err(|e| e.to_string())?;
    Ok(())
}

// ─────────────────────────────────────────────
// App setup
// ─────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> anyhow::Result<()> {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            fetch_usage,
            get_auth_status,
            logout,
            show_context_menu
        ])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            let quit = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
            let refresh = MenuItem::with_id(app, "refresh", "새로고침", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&refresh, &quit])?;

            let icon = app
                .default_window_icon()
                .ok_or_else(|| anyhow::anyhow!("앱 아이콘을 찾을 수 없습니다"))?
                .clone();

            TrayIconBuilder::new()
                .icon(icon)
                .menu(&menu)
                .menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "refresh" => {
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

            // Handle popup menu events (ctx_*)
            let app_handle = app.handle().clone();
            app_handle.on_menu_event(move |app, event| match event.id.as_ref() {
                "ctx_refresh" => {
                    let _ = app.emit("refresh", ());
                }
                "ctx_logout" => {
                    clear_credentials();
                    let _ = app.emit("auth_changed", ());
                }
                "ctx_login" => {
                    let _ = app.shell().open("https://claude.ai", None::<String>);
                }
                "ctx_quit" => {
                    app.exit(0);
                }
                _ => {}
            });

            Ok(())
        })
        .run(tauri::generate_context!())?;
    Ok(())
}
