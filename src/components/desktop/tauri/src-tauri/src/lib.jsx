use tauri::Manager;

mod commands;
mod store;
mod keychain;

pub fn run() {
    // Load .env if present (development)
    let _ = dotenvy::dotenv();

    // Init logger
    env_logger::Builder::from_env(
        env_logger::Env::default().default_filter_or("info"),
    )
    .init();

    tauri::Builder::default()
        // ── Plugins ──────────────────────────────────────────────────────────
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_single_instance::init(|app, _argv, _cwd| {
                // Focus existing window if second instance launched
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }),
        )
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ))
        // ── IPC Commands ─────────────────────────────────────────────────────
        .invoke_handler(tauri::generate_handler![
            // Assistant & mode
            commands::get_assistant_mode,
            commands::set_assistant_mode,
            // Feature flags
            commands::get_feature_flags,
            // Knowledge base
            commands::kb_retrieval,
            // LLM proxy
            commands::llm_proxy,
            // Client
            commands::get_my_client,
            // Sree auto-scan
            commands::sree_auto_scan_service,
            // Generic passthrough for Sree OS modules
            commands::invoke_backend,
            // Secure storage (keychain)
            commands::secure_store_set,
            commands::secure_store_get,
            commands::secure_store_delete,
            // App info
            commands::get_app_info,
            // System
            commands::open_devtools,
        ])
        // ── Setup ─────────────────────────────────────────────────────────────
        .setup(|app| {
            // Build tray icon
            #[cfg(desktop)]
            {
                use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem};
                use tauri::tray::TrayIconBuilder;

                let open = MenuItemBuilder::with_id("open", "Open AEVOICE").build(app)?;
                let separator = PredefinedMenuItem::separator(app)?;
                let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

                let menu = MenuBuilder::new(app)
                    .items(&[&open, &separator, &quit])
                    .build()?;

                TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .menu(&menu)
                    .tooltip("AEVOICE AI")
                    .on_menu_event(|app, event| match event.id().as_ref() {
                        "open" => {
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    })
                    .build(app)?;
            }

            // Store the app handle for use in commands
            let handle = app.handle().clone();
            app.manage(commands::AppState {
                handle,
                base_url: std::env::var("VITE_BASE44_APP_URL")
                    .unwrap_or_else(|_| "https://app.base44.com".to_string()),
            });

            log::info!("AEVOICE desktop app initialized");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running AEVOICE desktop application");
}