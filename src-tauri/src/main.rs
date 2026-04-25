// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if let Err(e) = tokenming_lib::run() {
        #[cfg(target_os = "windows")]
        show_error_dialog(&e.to_string());
        std::process::exit(1);
    }
}

#[cfg(target_os = "windows")]
fn show_error_dialog(msg: &str) {
    let escaped = msg.replace('\'', "''");
    let _ = std::process::Command::new("powershell")
        .args([
            "-WindowStyle",
            "Hidden",
            "-Command",
            &format!(
                "Add-Type -AssemblyName PresentationCore,PresentationFramework; \
                 [System.Windows.MessageBox]::Show('{}', 'TokenMing 오류', 'OK', 'Error') | Out-Null",
                escaped
            ),
        ])
        .status();
}
