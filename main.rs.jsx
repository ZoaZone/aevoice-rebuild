#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use tauri::{AppHandle, Manager};

#[tauri::command]
async fn open_mini_monitor(app: AppHandle) -> Result<(), String> {
  let _ = tauri::WindowBuilder::new(
    &app,
    "mini-monitor",
    tauri::WindowUrl::App("/mini-monitor".into())
  )
  .always_on_top(true)
  .decorations(false)
  .transparent(true)
  .resizable(true)
  .title("AEVOICE Mini Monitor")
  .build();
  Ok(())
}

#[tauri::command]
async fn open_overlay(app: AppHandle) -> Result<(), String> {
  let _ = tauri::WindowBuilder::new(
    &app,
    "overlay",
    tauri::WindowUrl::App("/overlay".into())
  )
  .always_on_top(true)
  .decorations(false)
  .transparent(true)
  .resizable(true)
  .fullscreen(false)
  .title("AEVOICE Overlay")
  .build();
  Ok(())
}

#[tauri::command]
async fn start_mic(app: AppHandle) -> Result<(), String> {
  // Push-to-talk: emit event to webview to start voice flow
  let _ = app.emit_all("voice:start", &serde_json::json!({"source":"tauri-ptt"}));
  Ok(())
}

#[tauri::command]
async fn check_update(app: AppHandle) -> Result<(), String> {
  match tauri::updater::check(&app).await {
    Ok(_) => Ok(()),
    Err(e) => Err(format!("update_error: {}", e))
  }
}

#[derive(Serialize)]
struct ScreenshotResult {
  data_url: Option<String>,
}

#[tauri::command]
async fn capture_screen() -> Result<ScreenshotResult, String> {
  // Scaffold: return None so frontend falls back to browser capture if needed
  Ok(ScreenshotResult { data_url: None })
}

#[tauri::command]
async fn screenshot() -> Result<ScreenshotResult, String> {
  capture_screen().await
}

#[tauri::command]
async fn dev_command(app: AppHandle, command: String) -> Result<String, String> {
  let lower = command.trim().to_lowercase();
  if lower.starts_with("open ") || lower.starts_with("goto ") {
    let parts: Vec<&str> = command.split_whitespace().collect();
    if parts.len() > 1 {
      let url = parts[1];
      let _ = tauri::Shell::open(&app.shell_scope(), url, None).map_err(|e| e.to_string());
      return Ok(format!("Opened {}", url));
    }
  } else if lower.starts_with("browse ") || lower.starts_with("research ") {
    // Forward to webview for LLM-backed research; we just emit an event
    let _ = app.emit_all("developer:command", &command);
    return Ok("Research forwarded".into());
  } else if lower == "screenshot" || lower == "capture screen" {
    let _ = app.emit_all("desktop:screenshot", &serde_json::json!({"source":"tauri"}));
    return Ok("Screenshot requested".into());
  }
  Err("unknown_command".into())
}

fn register_shortcuts(app: &tauri::AppHandle) {
  let app_handle = app.clone();
  // Cmd/Ctrl + Space for push-to-talk
  let _ = app.global_shortcut().register("CmdOrCtrl+Space", move || {
    let _ = app_handle.emit_all("voice:start", &serde_json::json!({"source":"shortcut"}));
  });
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      open_mini_monitor,
      open_overlay,
      start_mic,
      check_update,
      capture_screen,
      screenshot,
      dev_command
    ])
    .setup(|app| {
      register_shortcuts(&app.handle());
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}